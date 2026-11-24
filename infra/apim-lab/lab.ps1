param(
  [Parameter(Mandatory)][ValidateSet('Host', 'Wire', 'Smoke')][string]$Action,
  [Parameter(Mandatory)][guid]$SubscriptionId,
  [ValidateNotNullOrEmpty()][string]$ResourceGroupName = 'rg_demo_pamadigi',
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
if ($SubscriptionId -eq [guid]::Empty) { throw 'Isi SubscriptionId lingkungan sendiri, bukan GUID placeholder.' }
$sub = $SubscriptionId.ToString()
$rg = $ResourceGroupName
$arm = 'https://management.azure.com'
$scope = "/subscriptions/$sub/resourceGroups/$rg"
$profiles = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'profiles.json') | ConvertFrom-Json

function AzValue {
  param([string[]]$Arguments)
  $result = & az @Arguments --only-show-errors
  if ($LASTEXITCODE) { throw "Azure CLI command failed: $($Arguments[0..1] -join ' ')." }
  $result
}

$armToken = AzValue @('account','get-access-token','--subscription',$sub,'--query','accessToken','-o','tsv')
$armHeaders = @{ Authorization = "Bearer $armToken" }

function RequestJson {
  param([string]$Url, [string]$Method = 'GET', [hashtable]$Headers = $armHeaders, $Data)
  $args = @{ Method = $Method; Uri = $Url; Headers = $Headers; MaximumRedirection = 0
    SkipHttpErrorCheck = $true; TimeoutSec = 60; StatusCodeVariable = 'status' }
  if ($null -ne $Data) {
    $args.Body = ConvertTo-Json -InputObject $Data -Depth 20 -Compress
    $args.ContentType = 'application/json'
  }
  $result = Invoke-RestMethod @args
  if ($status -notin 200..299) {
    $code = $result.error.code
    if ($code -notmatch '^[A-Za-z0-9_]{1,100}$') { $code = 'AzureRequestFailed' }
    throw "$Method $(([uri]$Url).AbsolutePath) HTTP $status ($code)."
  }
  $result
}

$sites = AzValue @('deployment','group','show','--subscription',$sub,'-g',$rg,'-n',
  'pamadigi-apim-lab-hosting','--query','properties.outputs.webApps.value','-o','json') | ConvertFrom-Json
if (@($sites).Count -ne 3) { throw 'Expected exactly three sites from the approved deployment.' }

if ($Action -eq 'Host') {
  $tenant = AzValue @('account','show','--subscription',$sub,'--query','tenantId','-o','tsv')
  $operator = AzValue @('ad','signed-in-user','show','--query','id','-o','tsv')
  if (-not $operator) { throw 'The demo needs an authorized Entra operator.' }
  $graphToken = AzValue @('account','get-access-token','--subscription',$sub,'--resource','https://graph.microsoft.com/','--query','accessToken','-o','tsv')
  $graphHeaders = @{ Authorization = "Bearer $graphToken" }
  $graph = 'https://graph.microsoft.com/v1.0'
  $registrationName = "PAMA Digi Gateway Lab - $($sites[0].name)"
  $filter = [uri]::EscapeDataString("displayName eq '$registrationName'")
  $lookup = RequestJson "$graph/applications?`$filter=$filter&`$select=id,appId,displayName,web" -Headers $graphHeaders
  if (@($lookup.value).Count -gt 1) { throw 'More than one lab Entra app registration matched; no changes made.' }
  $reg = @($lookup.value) | Select-Object -First 1
  if (-not $reg) {
    $redirects = @($sites | ForEach-Object { "https://$($_.hostname)/.auth/login/aad/callback" })
    $reg = RequestJson "$graph/applications" POST $graphHeaders @{
      displayName = $registrationName
      signInAudience = 'AzureADMyOrg'
      web = @{
        redirectUris = $redirects
        implicitGrantSettings = @{ enableIdTokenIssuance = $true; enableAccessTokenIssuance = $false }
      }
    }
    RequestJson "$graph/servicePrincipals" POST $graphHeaders @{ appId = $reg.appId } | Out-Null
  } elseif (-not $reg.web.implicitGrantSettings.enableIdTokenIssuance) {
    # App Service's browser sign-in requests an authorization code and an ID token.
    AzValue @('ad','app','update','--id',$reg.appId,'--enable-id-token-issuance','true','-o','none') | Out-Null
  }

  $configSummary = foreach ($site in $sites) {
    $siteUri = "$arm$scope/providers/Microsoft.Web/sites/$($site.name)"
    $cfg = RequestJson "$siteUri/config/authsettingsV2/list?api-version=2024-11-01"
    [bool]($cfg.properties.platform.enabled -and $cfg.properties.identityProviders.azureActiveDirectory.registration.clientId -eq $reg.appId)
  }
  $password = $null
  if ($false -in $configSummary) {
    $password = (RequestJson "$graph/applications/$($reg.id)/addPassword" POST $graphHeaders @{
      passwordCredential = @{ displayName = 'App Service demo login'; endDateTime = [DateTime]::UtcNow.AddDays(14).ToString('o') }
    }).secretText
    if (-not $password) { throw 'Entra did not return a credential for the web login.' }
  }

  $zip = Join-Path ([System.IO.Path]::GetTempPath()) "pamadigi-app-$([guid]::NewGuid().ToString('N')).zip"
  $source = (Resolve-Path (Join-Path $PSScriptRoot '..\..\apps\apim-chat-lab')).Path
  try {
    Compress-Archive -LiteralPath @((Join-Path $source 'package.json'), (Join-Path $source 'server.mjs'), (Join-Path $source 'public')) -DestinationPath $zip
    foreach ($profile in $profiles) {
      $site = $sites | Where-Object id -eq $profile.id
      $siteUri = "$arm$scope/providers/Microsoft.Web/sites/$($site.name)"
      $settings = (RequestJson "$siteUri/config/appsettings/list?api-version=2024-11-01" POST).properties
      $props = @{}
      if ($settings) { foreach ($setting in $settings.PSObject.Properties) { $props[$setting.Name] = $setting.Value } }
      if ($password) { $props.AAD_CLIENT_SECRET = $password }
      $props.APP_LABEL = $profile.label
      $props.APP_ORIGIN = "https://$($site.hostname)"
      $props.FOUNDRY_PROJECT = $profile.project
      $props.DEPLOYMENT_NAME = $profile.deployment
      RequestJson "$siteUri/config/appsettings?api-version=2024-11-01" PUT $armHeaders @{ properties = $props } | Out-Null
      RequestJson "$siteUri/config/authsettingsV2?api-version=2024-11-01" PUT $armHeaders @{
        properties = @{
          platform = @{ enabled = $true }
          globalValidation = @{ requireAuthentication = $true; unauthenticatedClientAction = 'RedirectToLoginPage'; redirectToProvider = 'azureactivedirectory' }
          login = @{ tokenStore = @{ enabled = $false } }
          identityProviders = @{
            azureActiveDirectory = @{
              enabled = $true
              registration = @{
                clientId = $reg.appId
                clientSecretSettingName = 'AAD_CLIENT_SECRET'
                openIdIssuer = "https://login.microsoftonline.com/$tenant/v2.0"
              }
              validation = @{ defaultAuthorizationPolicy = @{ allowedPrincipals = @{ identities = @($operator) } } }
            }
          }
          httpSettings = @{ requireHttps = $true }
        }
      } | Out-Null
      AzValue @('webapp','deploy','--subscription',$sub,'-g',$rg,'-n',$site.name,'--src-path',$zip,
        '--type','zip','--async','true','--track-status','false','--timeout','180000','-o','none') | Out-Null
      Write-Output "$($profile.label): package submitted and Entra login configured — https://$($site.hostname)"
    }
  } finally {
    if (Test-Path -LiteralPath $zip -PathType Leaf) { Remove-Item -LiteralPath $zip }
  }
  return
}

$gateway = AzValue @('deployment','group','show','--subscription',$sub,'-g',$rg,'-n',
  'pamadigi-apim-lab-gateway','--query','properties.outputs','-o','json') | ConvertFrom-Json
if (-not $gateway.gatewayName.value -or @($gateway.routes.value).Count -ne 3) {
  throw 'Expected three configured routes from the approved APIM deployment.'
}
$apimUri = "$arm$scope/providers/Microsoft.ApiManagement/service/$($gateway.gatewayName.value)"
$keys = @{}
foreach ($profile in $profiles) {
  $route = $gateway.routes.value | Where-Object id -eq $profile.id
  $keys[$profile.id] = (RequestJson "$apimUri/subscriptions/$($route.subscriptionId)/listSecrets?api-version=2024-05-01" POST).primaryKey
  if (-not $keys[$profile.id]) { throw "No key returned for $($route.subscriptionId)." }
}
if (@($keys.Values | Select-Object -Unique).Count -ne 3) { throw 'APIM returned duplicate subscriptions keys.' }

if ($Action -eq 'Wire') {
  foreach ($profile in $profiles) {
    $route = $gateway.routes.value | Where-Object id -eq $profile.id
    $site = $sites | Where-Object id -eq $profile.id
    $siteUri = "$arm$scope/providers/Microsoft.Web/sites/$($site.name)"
    $settings = (RequestJson "$siteUri/config/appsettings/list?api-version=2024-11-01" POST).properties
    $props = @{}
    if ($settings) { foreach ($setting in $settings.PSObject.Properties) { $props[$setting.Name] = $setting.Value } }
    if (-not $props.AAD_CLIENT_SECRET) { throw 'Configure Entra login before attaching live gateway credentials.' }
    $props.APIM_BASE_URL = $route.baseUrl
    $props.APIM_SUBSCRIPTION_KEY = $keys[$profile.id]
    RequestJson "$siteUri/config/appsettings?api-version=2024-11-01" PUT $armHeaders @{ properties = $props } | Out-Null
    Write-Output "$($profile.label): gateway configuration saved on server."
  }
  return
}

function ChatCheck {
  param($Profile, [string]$KeyFrom, [ValidateSet('header','bearer','none','invalid')][string]$Auth)
  $route = $gateway.routes.value | Where-Object id -eq $Profile.id
  $requestHeaders = switch ($Auth) {
    'header' { @{ 'api-key' = $keys[$KeyFrom] } }
    'bearer' { @{ Authorization = "Bearer $($keys[$KeyFrom])" } }
    'invalid' { @{ 'api-key' = 'not-a-demo-credential' } }
    default { @{} }
  }
  $start = [DateTime]::UtcNow
  $body = ConvertTo-Json -Depth 6 -Compress @{
    model = 'apim-chooses-deployment'
    messages = @(@{ role = 'user'; content = 'Balas satu kalimat: uji koneksi PAMA Digi berhasil.' })
  }
  $response = Invoke-WebRequest -Method POST -Uri "$($route.baseUrl)/chat/completions" -Headers $requestHeaders `
    -ContentType 'application/json' -Body $body -SkipHttpErrorCheck -TimeoutSec 55 -MaximumRedirection 0
  $meta = [ordered]@{
    route = $Profile.path; auth = $Auth; keyAlias = $KeyFrom; status = [int]$response.StatusCode
    atUtc = $start.ToString('o')
  }
  foreach ($pair in @(@('x-pamadigi-request-id','gatewayRequestId'), @('apim-request-id','foundryResponseId'))) {
    $parsed = [guid]::Empty
    $value = @($response.Headers[$pair[0]]) | Select-Object -First 1
    if ($value -and [guid]::TryParse($value, [ref]$parsed)) { $meta[$pair[1]] = $parsed.ToString() }
  }
  if ($meta.status -eq 200) {
    $result = $response.Content | ConvertFrom-Json
    $meta.answerPresent = [bool]($result.choices[0].message.content)
    if ($result.model -match '^[A-Za-z0-9._-]{1,80}$') { $meta.model = $result.model }
    $meta.inputTokens = $result.usage.prompt_tokens
    $meta.outputTokens = $result.usage.completion_tokens
    $meta.totalTokens = $result.usage.total_tokens
  } else {
    if ($response.Headers['Content-Type'] -match 'application/json') {
      $result = $response.Content | ConvertFrom-Json
      if ($result.error.code -match '^[A-Za-z0-9_]{1,80}$') { $meta.errorCode = $result.error.code }
    }
  }
  [pscustomobject]$meta
}

$evidence = [System.Collections.Generic.List[object]]::new()
foreach ($target in $profiles) {
  $probe = ChatCheck $target $target.id 'header'
  $evidence.Add($probe)
  $probe | ConvertTo-Json -Compress
  if ($probe.status -ne 200 -or -not $probe.answerPresent -or $null -eq $probe.totalTokens -or -not $probe.gatewayRequestId) {
    throw "Stopped live calls after an unexpected outcome on $($target.path)."
  }
}
foreach ($target in $profiles) {
  foreach ($other in $profiles | Where-Object id -ne $target.id) {
    $probe = ChatCheck $target $other.id 'header'
    $evidence.Add($probe)
    $probe | ConvertTo-Json -Compress
    if ($probe.status -notin 401,403) { throw 'Cross-route subscription was not rejected by APIM as expected.' }
  }
}
foreach ($auth in @('none','invalid')) {
  $probe = ChatCheck $profiles[0] '' $auth
  $evidence.Add($probe)
  $probe | ConvertTo-Json -Compress
  if ($probe.status -notin 401,403) { throw 'Unauthenticated request was not rejected as expected.' }
}
foreach ($target in $profiles) {
  $probe = ChatCheck $target $target.id 'bearer'
  $evidence.Add($probe)
  $probe | ConvertTo-Json -Compress
}
if ($OutputPath) { ConvertTo-Json -InputObject $evidence.ToArray() -Depth 10 | Set-Content -LiteralPath $OutputPath -Encoding utf8 }

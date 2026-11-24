targetScope = 'resourceGroup'

param location string = 'eastasia'
param suffix string = substring(uniqueString(resourceGroup().id), 0, 7)
param publisherEmail string
param foundryName string = 'foundrydemoresourcedigi1'
param appInsightsName string = 'appi-foundrydemoresourcedigi1-9551'
param tags object = {
  workload: 'pamadigi-apim-lab'
}

var profiles = loadJsonContent('profiles.json')
var scopeRole = '53ca6127-db72-4b80-b1b0-d745d6d5456d'
var telemetryRole = '3913510d-42f4-4e42-8a64-420c390055eb'
var projectPolicy = loadTextContent('route-policy.xml')
var productPolicy = loadTextContent('product-policy.xml')
var gatewayPolicy = loadTextContent('gateway-policy.xml')
var noPayload = {
  body: { bytes: 0 }
  headers: []
  dataMasking: {
    queryParams: [
      { mode: 'Hide', value: 'subscription-key' }
      { mode: 'Hide', value: 'key' }
      { mode: 'Hide', value: 'api-key' }
    ]
  }
}

resource apim 'Microsoft.ApiManagement/service@2024-05-01' = {
  name: 'apim-pamadigi-chat-${suffix}'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: 'Consumption'
    capacity: 0
  }
  properties: {
    publisherEmail: publisherEmail
    publisherName: 'PAMA Digi Lab'
  }
}

resource account 'Microsoft.CognitiveServices/accounts@2025-06-01' existing = {
  name: foundryName
}

resource projects 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' existing = [for p in profiles: {
  parent: account
  name: p.project
}]

resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

resource projectAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = [for (p, i) in profiles: {
  name: guid(projects[i].id, apim.id, scopeRole)
  scope: projects[i]
  properties: {
    principalId: apim.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', scopeRole)
  }
}]

resource telemetryWrite 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(appInsights.id, apim.id, telemetryRole)
  scope: appInsights
  properties: {
    principalId: apim.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', telemetryRole)
  }
}

resource logger 'Microsoft.ApiManagement/service/loggers@2024-05-01' = {
  parent: apim
  name: 'pamadigi-appinsights'
  properties: {
    loggerType: 'applicationInsights'
    resourceId: appInsights.id
    description: 'Metadata APIM PAMA Digi; tanpa payload atau kredensial client'
    credentials: {
      connectionString: appInsights.properties.ConnectionString
      identityClientId: 'SystemAssigned'
    }
  }
  dependsOn: [telemetryWrite]
}

resource diagnostics 'Microsoft.ApiManagement/service/diagnostics@2024-05-01' = {
  parent: apim
  name: 'applicationinsights'
  properties: {
    loggerId: logger.id
    alwaysLog: 'allErrors'
    sampling: {
      samplingType: 'fixed'
      percentage: 100
    }
    httpCorrelationProtocol: 'W3C'
    logClientIp: false
    verbosity: 'information'
    frontend: {
      request: noPayload
      response: noPayload
    }
    backend: {
      request: noPayload
      response: noPayload
    }
  }
}

resource globalPolicy 'Microsoft.ApiManagement/service/policies@2024-05-01' = {
  name: 'policy'
  parent: apim
  properties: {
    format: 'rawxml'
    value: gatewayPolicy
  }
}

resource apis 'Microsoft.ApiManagement/service/apis@2025-09-01-preview' = [for p in profiles: {
  name: p.path
  parent: apim
  properties: {
    displayName: 'PAMA Digi - ${p.label}'
    path: '${p.path}/openai/v1'
    protocols: ['https']
    subscriptionRequired: true
    subscriptionKeyParameterNames: {
      header: 'api-key'
      query: 'subscription-key'
      bearer: 'enabled'
    }
  }
}]

resource chat 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = [for (p, i) in profiles: {
  name: 'chat-completions'
  parent: apis[i]
  properties: {
    displayName: 'Chat Completions'
    method: 'POST'
    urlTemplate: '/chat/completions'
  }
}]

resource route 'Microsoft.ApiManagement/service/apis/policies@2024-05-01' = [for (p, i) in profiles: {
  name: 'policy'
  parent: apis[i]
  properties: {
    format: 'rawxml'
    value: replace(
      replace(
        replace(
          replace(projectPolicy, '__FOUNDRY__', foundryName),
          '__PROJECT__', p.project
        ),
        '__DEPLOYMENT__', p.deployment
      ),
      '__SUBSCRIPTION__', 'pamadigi-${p.path}'
    )
  }
}]

resource products 'Microsoft.ApiManagement/service/products@2024-05-01' = [for p in profiles: {
  name: 'pamadigi-${p.path}'
  parent: apim
  properties: {
    displayName: 'PAMA Digi - ${p.label}'
    subscriptionRequired: true
    approvalRequired: true
    state: 'published'
  }
}]

resource productLimits 'Microsoft.ApiManagement/service/products/policies@2024-05-01' = [for (p, i) in profiles: {
  name: 'policy'
  parent: products[i]
  properties: {
    format: 'rawxml'
    value: productPolicy
  }
}]

resource links 'Microsoft.ApiManagement/service/products/apis@2024-05-01' = [for (p, i) in profiles: {
  name: apis[i].name
  parent: products[i]
  dependsOn: [
    apis[i]
    productLimits[i]
    route[i]
    chat[i]
  ]
}]

resource subscriptions 'Microsoft.ApiManagement/service/subscriptions@2024-05-01' = [for (p, i) in profiles: {
  name: 'pamadigi-${p.path}'
  parent: apim
  properties: {
    displayName: 'PAMA Digi - ${p.label}'
    scope: '/products/${products[i].name}'
    state: 'active'
    allowTracing: false
  }
  dependsOn: [
    links[i]
    diagnostics
    globalPolicy
    projectAccess[i]
  ]
}]

output gatewayName string = apim.name
output gatewayUrl string = apim.properties.gatewayUrl
output routes array = [for p in profiles: {
  id: p.id
  subscriptionId: 'pamadigi-${p.path}'
  baseUrl: '${apim.properties.gatewayUrl}/${p.path}/openai/v1'
}]

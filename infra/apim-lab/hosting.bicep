targetScope = 'resourceGroup'

param location string = 'eastasia'
param suffix string = substring(uniqueString(resourceGroup().id), 0, 7)
param tags object = {
  workload: 'pamadigi-apim-lab'
}

var profiles = loadJsonContent('profiles.json')

resource plan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: 'asp-pamadigi-apim-${suffix}'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  properties: {
    reserved: true
  }
}

resource apps 'Microsoft.Web/sites@2024-11-01' = [for p in profiles: {
  name: 'pamadigi-chat-${p.id}-${suffix}'
  location: location
  tags: union(tags, { route: p.path })
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|24-lts'
      appCommandLine: 'node server.mjs'
      alwaysOn: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
    }
  }
}]

resource ftp 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-11-01' = [for (p, i) in profiles: {
  parent: apps[i]
  name: 'ftp'
  properties: {
    allow: false
  }
}]

resource scm 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2024-11-01' = [for (p, i) in profiles: {
  parent: apps[i]
  name: 'scm'
  properties: {
    allow: false
  }
}]

output webApps array = [for (p, i) in profiles: {
  id: p.id
  name: apps[i].name
  hostname: apps[i].properties.defaultHostName
}]

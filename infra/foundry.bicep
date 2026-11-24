param location string
param tags object

var scenario = loadJsonContent('scenario.json')
var name = 'fd-pamadigi-usage-${uniqueString(resourceGroup().id)}'

module account 'br/public:avm/res/cognitive-services/account:0.19.2' = {
  name: 'pamadigi-usage-account'
  params: {
    name: name
    location: location
    kind: 'AIServices'
    sku: 'S0'
    customSubDomainName: name
    allowProjectManagement: true
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
    managedIdentities: {
      systemAssigned: true
    }
    deployments: [for model in scenario.models: {
      name: model.deployment
      model: {
        format: 'OpenAI'
        name: model.name
        version: model.version
      }
      sku: {
        name: 'GlobalStandard'
        capacity: 10
      }
      versionUpgradeOption: 'OnceCurrentVersionExpired'
    }]
    tags: tags
    enableTelemetry: false
  }
}

resource parent 'Microsoft.CognitiveServices/accounts@2025-06-01' existing = {
  name: name
}

resource projects 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = [for project in scenario.projects: {
  parent: parent
  name: project.name
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    displayName: project.label
    description: project.description
  }
  dependsOn: [account]
}]

output accountName string = account.outputs.name
output projectEndpoints object = toObject(scenario.projects, p => p.name, p => 'https://${name}.services.ai.azure.com/api/projects/${p.name}')

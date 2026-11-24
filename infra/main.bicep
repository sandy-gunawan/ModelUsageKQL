targetScope = 'subscription'

@description('Region untuk lab, bukan jaminan lokasi inferensi Global Standard.')
param location string

var groupName = 'rg_demo_pamadigi'
var tags = {
  purpose: 'foundry-usage-demo'
  environment: 'demo'
}

module lab 'br/public:avm/res/resources/resource-group:0.4.4' = {
  name: 'pamadigi-usage-rg'
  params: {
    name: groupName
    location: location
    tags: tags
    enableTelemetry: false
  }
}

module foundry 'foundry.bicep' = {
  name: 'pamadigi-usage-foundry'
  scope: resourceGroup(groupName)
  params: {
    location: location
    tags: tags
  }
  dependsOn: [lab]
}

output resourceGroupName string = lab.outputs.name
output accountName string = foundry.outputs.accountName
output projectEndpoints object = foundry.outputs.projectEndpoints

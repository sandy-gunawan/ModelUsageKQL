@description('Object ID of the signed-in lab publisher, not a credential.')
param publisherObjectId string

param location string = resourceGroup().location

var suffix = uniqueString(resourceGroup().id)
var ruleName = 'dcr-pama-usage-${suffix}'
var stream = 'Custom-FoundryDemoRequests_CL'
var columns = loadJsonContent('usage-schema.json')
var tags = {
  environment: 'demo'
  purpose: 'foundry-usage-demo'
}

// The AVM workspace module accepts whole GB only; this lab uses a 0.1 GB daily cap.
resource workspace 'Microsoft.OperationalInsights/workspaces@2025-02-01' = {
  name: 'law-pamadigi-usage-${suffix}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    workspaceCapping: {
      dailyQuotaGb: json('0.1')
    }
    features: {
      disableLocalAuth: true
      enableLogAccessUsingOnlyResourcePermissions: false
    }
  }
}

resource requests 'Microsoft.OperationalInsights/workspaces/tables@2025-02-01' = {
  parent: workspace
  name: 'FoundryDemoRequests_CL'
  properties: {
    plan: 'Analytics'
    retentionInDays: 30
    schema: {
      name: 'FoundryDemoRequests_CL'
      columns: [for column in columns: {
        name: column.name
        type: column.type == 'datetime' ? 'dateTime' : column.type
      }]
    }
  }
}

module rule 'br/public:avm/res/insights/data-collection-rule:0.11.0' = {
  params: {
    name: ruleName
    location: location
    tags: tags
    enableTelemetry: false
    dataCollectionRuleProperties: {
      kind: 'Direct'
      streamDeclarations: {
        '${stream}': {
          columns: columns
        }
      }
      destinations: {
        logAnalytics: [
          {
            name: 'pamadigiLogs'
            workspaceResourceId: workspace.id
          }
        ]
      }
      dataFlows: [
        {
          streams: [stream]
          destinations: ['pamadigiLogs']
          outputStream: stream
          transformKql: 'source'
        }
      ]
    }
    roleAssignments: [
      {
        principalId: publisherObjectId
        principalType: 'User'
        roleDefinitionIdOrName: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '3913510d-42f4-4e42-8a64-420c390055eb')
      }
    ]
  }
  dependsOn: [requests]
}

module workbook 'usage-workbook.bicep' = {
  params: {
    location: location
    workspaceName: workspace.name
  }
  dependsOn: [requests]
}

output telemetry object = {
  subscription: subscription().subscriptionId
  account: 'fd-pamadigi-usage-${suffix}'
  stream: stream
}
output workspaceId string = workspace.id
output workbookId string = workbook.outputs.workbookId
output ruleId string = rule.outputs.resourceId

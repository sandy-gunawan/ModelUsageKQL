param location string = resourceGroup().location
param workspaceName string = 'law-pamadigi-usage-${uniqueString(resourceGroup().id)}'

resource workspace 'Microsoft.OperationalInsights/workspaces@2025-02-01' existing = {
  name: workspaceName
}

resource foundry 'Microsoft.CognitiveServices/accounts@2025-06-01' existing = {
  name: 'fd-pamadigi-usage-${uniqueString(resourceGroup().id)}'
}

var commonQuery = trim('''
let Events = FoundryDemoRequests_CL
| where TimeGenerated {TimeRange}
| where '{Project}' == '_all_' or Project == '{Project}'
| where '{Model}' == '_all_' or Model == '{Model}'
| summarize arg_max(TimeGenerated, *) by EventId;
''')

// Public Global Standard USD rates per million tokens, checked 18 November 2026.
var estimateQuery = trim('''
let Rates = datatable(Model:string, Deployment:string, InputRate:real, OutputRate:real) [
  'gpt-5-nano', 'demo-5-nano', 0.05, 0.40,
  'gpt-5-mini', 'demo-5-mini', 0.25, 2.00,
  'gpt-5.4-mini', 'demo-54-mini', 0.75, 4.50,
  'gpt-6.1-terra', 'demo-61-terra', 1.00, 5.00,
  'gpt-6.1-sol', 'demo-61-sol', 2.00, 10.00
];
let RatedEvents = Events
| lookup kind=leftouter Rates on Model, Deployment
| extend EstimatedUSD = (todouble(InputTokens) * InputRate + todouble(OutputTokens) * OutputRate) / 1000000.0;
''')

var billingQuery = {
  version: 'ARMEndpoint/1.0'
  method: 'POST'
  path: '${resourceGroup().id}/providers/Microsoft.CostManagement/query?'
  headers: []
  urlParams: [
    { key: 'api-version', value: '2025-03-01' }
  ]
  batchDisabled: true
  data: string({
    type: 'ActualCost'
    timeframe: 'MonthToDate'
    dataset: {
      granularity: 'None'
      aggregation: { totalCost: { name: 'PreTaxCost', function: 'Sum' } }
      filter: { dimensions: { name: 'ResourceId', operator: 'In', values: [foundry.id] } }
    }
  })
  transformers: [
    {
      type: 'jsonpath'
      settings: {
        tablePath: '$.properties.rows'
        columns: [
          { columnid: 'BiayaAzureSebelumPajak', path: '$[0]' }
          { columnid: 'MataUang', path: '$[1]' }
        ]
      }
    }
  ]
}

var workspaceNotebook = replace(loadTextContent('usage.workbook.json'), '__WORKSPACE_ID__', workspace.id)
var escapedEvents = replace(replace(commonQuery, '\r', ''), '\n', '\\n')
var escapedRates = replace(replace(estimateQuery, '\r', ''), '\n', '\\n')
// Serialize the whole ARM query property so nested JSON keeps its escaping.
var billingProperty = string({ query: string(billingQuery) })
var notebook = replace(
  replace(replace(workspaceNotebook, '__FILTERED_EVENTS__', escapedEvents), '__RATED_EVENTS__', escapedRates),
  '"query": "__BILLED_COST_QUERY__"',
  substring(billingProperty, 1, max(0, length(billingProperty) - 2))
)

resource workbook 'Microsoft.Insights/workbooks@2022-04-01' = {
  name: guid(resourceGroup().id, 'pamadigi-foundry-usage')
  location: location
  kind: 'shared'
  tags: {
    environment: 'demo'
    purpose: 'foundry-usage-demo'
  }
  properties: {
    displayName: 'PAMADIGI - Foundry Usage'
    description: 'Pemakaian model dari request lab yang tercatat, per project dan model.'
    category: 'workbook'
    sourceId: workspace.id
    serializedData: notebook
  }
}

output workbookId string = workbook.id

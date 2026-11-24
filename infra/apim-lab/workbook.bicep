targetScope = 'resourceGroup'

param workspaceName string = 'log-foundrydemoresourcedigi1-be5que3gzucd6'
param location string = 'eastus'

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = {
  name: workspaceName
}

var source = loadTextContent('../../queries/apim-foundry-report.kql')
var traffic = '''

| summarize Request=count(), Sukses=countif(HTTP == 200), Ditolak=countif(not(Diteruskan) and HTTP in (400,401,403,429)),
    p95Ms=round(percentile(LatensiMs, 95), 0) by Aplikasi, Rute
| order by Rute asc, Aplikasi asc
'''
var usage = '''

| where Diteruskan
| summarize Request=count(), AdaToken=countif(isnotnull(TotalToken)), InputToken=sum(InputToken), OutputToken=sum(OutputToken),
    TotalToken=sum(TotalToken), AdaEstimasi=countif(isnotnull(EstimasiUSD)), EstimasiUSD=sum(EstimasiUSD)
    by Aplikasi, ProjectTujuan, ProjectTercatat, DeploymentTercatat, SumberToken, StatusCocok
| extend InputToken=iff(AdaToken > 0, InputToken, long(null)), OutputToken=iff(AdaToken > 0, OutputToken, long(null)),
    TotalToken=iff(AdaToken > 0, TotalToken, long(null)), EstimasiUSD=iff(AdaEstimasi == Request, round(EstimasiUSD, 8), real(null))
| order by Aplikasi asc
'''
var panels = [
  { name: 'traffic', title: '1 · Traffic API Management', query: '${source}${traffic}' }
  { name: 'usage', title: '2 · Token dan estimasi penggunaan model', query: '${source}${usage}' }
  { name: 'trace', title: '3 · Cari satu request lewat IdGateway', query: '${source}\n| take 60' }
]

var elements = [for p in panels: {
  type: 3
  name: p.name
  content: {
    version: 'KqlItem/1.0'
    title: p.title
    query: p.query
    queryType: 0
    resourceType: 'microsoft.operationalinsights/workspaces'
    crossComponentResources: [workspace.id]
    visualization: 'table'
  }
}]

resource report 'Microsoft.Insights/workbooks@2022-04-01' = {
  name: guid(resourceGroup().id, 'pamadigi-apim-foundry-report')
  location: location
  kind: 'shared'
  tags: { workload: 'pamadigi-apim-lab' }
  properties: {
    displayName: 'PAMA Digi · APIM dan Foundry'
    description: 'Traffic gateway dan token model. Bukan tagihan Azure.'
    category: 'workbook'
    sourceId: workspace.id
    serializedData: string({
      version: 'Notebook/1.0'
      fallbackResourceIds: [workspace.id]
      items: concat([
        {
          type: 1
          name: 'intro'
          content: {
            json: '# PAMA Digi · APIM dan Foundry\n24 jam terakhir. APIM mencatat rute dan status; Foundry mencatat deployment dan token. Kolom `SumberToken` menunjukkan sumber yang dipakai. `EstimasiUSD` bukan tagihan. Request yang ditolak tidak diberi token nol.'
          }
        }
      ], elements)
    })
  }
}

output workbookId string = report.id

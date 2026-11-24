// Koordinat [kiri, atas, kanan, bawah] dihitung pada PNG asli sebelum crop.
const apimWorkshopShots = {
  "01-rg": {"title":"Resource group PAMA Digi","crop":[0,382,707,526],"marks":[[89,396,561,443,"Cari baris API Management. Gateway ini yang dipakai oleh ketiga Web App."],[89,462,556,510,"Temukan Application Insights untuk menerima metadata gateway."]]},
  "02-foundry": {"title":"Resource Foundry dan region","crop":[13,20,1140,574],"marks":[[82,29,548,86,"Cocokkan nama resource Foundry: foundrydemoresourcedigi1."],[972,507,1073,572,"Lokasi resource yang dipakai adalah East US."]]},
  "03-projects": {"title":"Tiga project di satu Foundry","crop":[14,9,928,435],"marks":[[430,235,635,405,"Di daftar Projects, cocokkan project Main, X, dan Y. Ketiganya ada di resource induk yang sama."]]},
  "04-f1": {"title":"App Service plan Linux","crop":[15,1,659,300],"marks":[[58,6,448,65,"Ini plan Linux yang dipakai bersama. Label F1 terlihat pada detail App Service plan di Overview masing-masing Web App."],[312,243,399,288,"Cek lokasi East Asia."]]},
  "05-apim-deployment": {"title":"Deployment Bicep gateway","crop":[295,110,990,381],"marks":[[377,249,742,288,"Cari deployment pamadigi-apim-lab-gateway dan pastikan statusnya Succeeded."]]},
  "06-apim-overview": {"title":"Gateway URL dan tier APIM","crop":[292,115,1176,307],"marks":[[805,145,1160,195,"Gunakan Gateway URL sebagai awalan Base URL untuk aplikasi."],[805,198,935,244,"Pastikan tier-nya Consumption."],[318,244,426,292,"Gateway lab berada di East Asia."]]},
  "07-apim-identity": {"title":"System-assigned identity APIM","crop":[280,72,820,492],"marks":[[310,275,408,338,"Di tab System assigned, pastikan Status = On."],[310,444,528,488,"Buka Azure role assignments untuk melihat scope dan role yang diberikan."]]},
  "08-native-diagnostics": {"title":"Diagnostic settings Foundry","crop":[10,235,1176,466],"marks":[[52,363,318,464,"Centang Request and Response Logs serta Azure OpenAI Request Usage."],[602,272,861,308,"Pilih Send to Log Analytics workspace."],[610,392,1167,457,"Pastikan workspace-nya sama dengan yang dipakai laporan APIM."]]},
  "09-appinsights": {"title":"Workspace tujuan Application Insights","crop":[288,163,1260,385],"marks":[[804,241,1147,294,"Pada Logs workspace, cocokkan nama workspace tujuan. Jangan tampilkan connection string."]]},
  "10-apim-logger": {"title":"Logger APIM ke Application Insights","crop":[297,105,1298,302],"marks":[[323,245,575,289,"Gunakan logger pamadigi-appinsights untuk mengirim metadata APIM ke Application Insights."]]},
  "11-apim-diagnostics": {"title":"Matikan pencatatan isi request","crop":[412,60,1317,501],"marks":[[480,426,1005,491,"Number of payload bytes to log = 0. Konfigurasi lab tidak merekam isi chat."]]},
  "12-cross-key": {"title":"Key X ditolak saat dipakai ke Y","crop":[295,126,1255,446],"marks":[[594,373,1190,414,"Baris Project X menuju project-y mendapat HTTP 401. Request tidak sampai ke Foundry."]]},
  "13-kql-traffic": {"title":"Traffic, sukses, dan penolakan","crop":[294,240,1111,652],"marks":[[748,279,950,639,"Bandingkan kolom Sukses dan Ditolak untuk setiap kombinasi aplikasi dan rute."]]},
  "14-kql-usage": {"title":"Jumlah token di laporan","crop":[301,316,1257,520],"marks":[[580,370,966,508,"Baca InputToken, OutputToken, dan TotalToken. Gunakan satu sumber token per request."]]},
  "15-kql-one-request": {"title":"Cocokkan ID dari uji API langsung","crop":[294,125,1243,342],"marks":[[385,233,1223,274,"Status Cocok menunjukkan IdGateway berhasil dikaitkan dengan IdFoundry untuk request ini."]]},
  "16-workbook": {"title":"Workbook PAMA Digi di Azure Portal","crop":[295,102,1246,432],"marks":[[320,113,783,153,"Pastikan Workbook yang dibuka bernama PAMA Digi · APIM dan Foundry."],[317,244,566,278,"Panel Traffic API Management merangkum hasil per rute dan subscription."]]},
  "17-kql-browser-requests": {"title":"Tiga request browser di Azure Logs","crop":[17,88,714,214],"marks":[[106,119,355,201,"Ketiga request mendapat HTTP 200 dan 33 token masing-masing."],[515,119,706,201,"Cocokkan IdGateway dengan ID yang tampil di Web App."]]},
  "18-workbook-native-requests": {"title":"Request explorer di Workbook lama","crop":[5,15,1330,224],"marks":[[467,94,550,221,"Caller masih unknown karena query lama tidak mengambil identitas dari RequestResponse."],[1032,92,1303,221,"CorrelationId sama dengan IdFoundry di Workbook baru. Baris ini berasal dari log Foundry."]]},
  "19-workbook-apim-requests": {"title":"Pasangan ID di Workbook baru","crop":[5,61,1322,238],"marks":[[533,109,683,234,"Pastikan StatusCocok bernilai Cocok."],[740,109,1016,234,"Cari IdGateway dari Web App yang baru diuji."],[1038,109,1315,234,"Pakai IdFoundry sebagai CorrelationId saat membuka Workbook lama."]]},
  "20-kql-foundry-caller": {"title":"Identitas yang dilihat Foundry","crop":[5,32,590,158],"marks":[[295,62,511,154,"Dua kolom kecocokan bernilai true: pemanggil langsungnya adalah Managed Identity APIM."],[524,62,574,154,"AdaIP hanya menandai bahwa field IP terisi; bukan bukti identitas pengguna Web App."]]},
  "21-create-http-x": {"title":"Contoh formulir HTTP API — belum disimpan","crop":[8,12,885,308],"marks":[[172,99,855,174,"Isi Display name PAMA Digi - Project X dan Name project-x. Contoh ini tidak disimpan."],[171,210,855,248,"Isi API URL suffix project-x/openai/v1. Web service URL dikosongkan karena policy menetapkan backend."],[171,259,855,307,"Simpan Base URL ini untuk konfigurasi server Web App."]]},
  "22-x-policy-model": {"title":"Policy memilih deployment X","crop":[1,4,835,63],"marks":[[122,20,826,45,"Baris ini mengisi ulang field model dengan modelprojectX. Nilai model dari client tidak menentukan target."]]},
  "23-x-policy-route": {"title":"Policy mengarah ke endpoint Foundry","crop":[1,4,941,170],"marks":[[125,8,926,49,"set-backend-service memilih host Foundry, lalu rewrite-uri menuju project pamadigiproject1_proj1."],[125,138,730,166,"authentication-managed-identity mengambil token Entra untuk https://ai.azure.com. Tidak ada key Foundry di policy."]]},
  "24-x-operation-path": {"title":"Path POST Chat Completions","crop":[0,0,180,89],"marks":[[15,60,172,83,"Frontend menerima POST /chat/completions. Tambahkan path ini sesudah Base URL APIM."]]},
  "main-01": {"title":"Overview Web App Main","crop":[744,195,1148,330],"marks":[[791,206,1120,259,"Default domain membuka Web App Main."],[791,264,1111,316,"App Service Plan menunjukkan plan F1 yang dipakai."]]},
  "main-02": {"title":"Login Web App Main","crop":[298,194,987,467],"marks":[[310,330,718,365,"Require authentication mewajibkan login untuk membuka UI demo."],[310,394,633,429,"Request tanpa sesi diarahkan ke Microsoft. Ini terpisah dari key APIM."]]},
  "main-03": {"title":"Setting server Web App Main","crop":[298,81,877,398],"marks":[[319,279,577,330,"Isi APIM_BASE_URL dengan URL gateway untuk Main, bukan URL Foundry."],[319,332,838,387,"Isi APIM_SUBSCRIPTION_KEY dengan key subscription Main. Nilai pada gambar ditutup permanen."]]},
  "main-04": {"title":"API Settings untuk Main","crop":[264,240,1060,582],"marks":[[428,321,1048,367,"Salin Base URL Main. Ini URL depan gateway, bukan URL backend."],[305,524,460,572,"Subscription required harus dicentang."]]},
  "main-05": {"title":"Design operasi Main","crop":[533,155,1318,438],"marks":[[544,370,751,414,"Pilih POST Chat Completions di daftar operasi Main."],[1116,308,1311,348,"Untuk policy satu API, pilih All operations lalu buka ikon kode di Inbound processing."]]},
  "main-06": {"title":"Product Main","crop":[297,113,1009,376],"marks":[[315,191,487,236,"Product ini mewajibkan subscription."],[315,321,568,370,"Product hanya berisi API Main."]]},
  "main-07": {"title":"Subscription key Main","crop":[275,209,1044,417],"marks":[[320,337,478,375,"Gunakan subscription Main saja. Primary key dan secondary key disamarkan."],[792,337,1028,375,"Scope mengarah ke product Main dan statusnya Active."]]},
  "main-08-iam": {"title":"Hak APIM pada project Main","crop":[4,140,1210,333],"marks":[[48,261,1002,314,"Managed Identity APIM mendapat Foundry User pada scope project Main, bukan level akun."]]},
  "main-09": {"title":"HTTP 200 Main dari uji API langsung","crop":[295,126,1240,425],"marks":[[595,372,1190,413,"Percobaan dari client HTTP untuk Main mendapat 200. Ini bukan tangkapan klik Web App."]]},
  "x-01": {"title":"Overview Web App X","crop":[744,195,1148,330],"marks":[[791,206,1120,259,"Default domain membuka Web App Project X."],[791,264,1111,316,"App Service Plan menunjukkan plan F1 yang dipakai."]]},
  "x-02": {"title":"Login Web App X","crop":[298,194,987,467],"marks":[[310,330,718,365,"Require authentication mewajibkan login untuk membuka UI demo."],[310,394,633,429,"Request tanpa sesi diarahkan ke Microsoft. Ini terpisah dari key APIM."]]},
  "x-03": {"title":"Setting server Web App X","crop":[298,81,877,398],"marks":[[319,279,577,330,"Isi APIM_BASE_URL dengan URL gateway untuk Project X, tanpa /chat/completions."],[319,332,838,387,"Isi APIM_SUBSCRIPTION_KEY dengan key subscription X. Jangan pernah mengirimnya ke JavaScript browser."]]},
  "x-04": {"title":"API Settings untuk Project X","crop":[264,240,1060,582],"marks":[[428,321,1048,367,"Gunakan Base URL dengan suffix project-x/openai/v1."],[305,524,460,572,"Subscription required membuat client wajib mengirim key."]]},
  "x-05": {"title":"Design operasi Project X","crop":[430,155,1279,431],"marks":[[445,369,678,414,"Pilih atau tambahkan operasi POST Chat Completions dengan URL /chat/completions."],[1022,303,1238,351,"Buka editor kode di All operations → Inbound processing untuk policy API ini."]]},
  "x-06": {"title":"Product Project X","crop":[297,113,1009,376],"marks":[[315,191,487,236,"Product ini mewajibkan subscription."],[315,321,568,370,"Product hanya berisi API Project X."]]},
  "x-07": {"title":"Subscription key Project X","crop":[275,209,1044,417],"marks":[[320,371,478,410,"Pilih subscription Project X, bukan built-in all-access. Key tetap disamarkan."],[792,371,1028,410,"Scope mengarah ke product Project X dan statusnya Active."]]},
  "x-08-iam": {"title":"Hak APIM pada Project X","crop":[4,140,1210,388],"marks":[[48,312,1002,367,"Di scope pamadigiproject1_proj1, berikan Foundry User pada Managed Identity APIM. Ini bukan role pengguna browser."]]},
  "x-09": {"title":"HTTP 200 X dari uji API langsung","crop":[295,126,1240,425],"marks":[[595,372,1190,413,"Percobaan dari client HTTP untuk X mendapat 200. Uji antarmuka Web App tampil di bagian lain."]]},
  "y-01": {"title":"Overview Web App Y","crop":[744,195,1148,330],"marks":[[791,206,1120,259,"Default domain membuka Web App Project Y."],[791,264,1111,316,"App Service Plan menunjukkan plan F1 yang dipakai."]]},
  "y-02": {"title":"Login Web App Y","crop":[298,194,987,467],"marks":[[310,330,718,365,"Require authentication mewajibkan login untuk membuka UI demo."],[310,394,633,429,"Request tanpa sesi diarahkan ke Microsoft. Ini terpisah dari key APIM."]]},
  "y-03": {"title":"Setting server Web App Y","crop":[298,81,877,398],"marks":[[319,279,577,330,"Isi APIM_BASE_URL dengan URL gateway untuk Project Y."],[319,332,838,387,"Isi APIM_SUBSCRIPTION_KEY dengan key subscription Y. Nilai pada gambar ditutup permanen."]]},
  "y-04": {"title":"API Settings untuk Project Y","crop":[264,240,1060,582],"marks":[[428,321,1048,367,"Gunakan Base URL dengan suffix project-y/openai/v1."],[305,524,460,572,"Subscription required harus dicentang."]]},
  "y-05": {"title":"Design operasi Project Y","crop":[433,155,1280,433],"marks":[[448,370,670,414,"Pilih POST Chat Completions pada route Y."],[1022,303,1242,351,"Untuk policy di level API, buka ikon kode pada Inbound processing di All operations."]]},
  "y-06": {"title":"Product Project Y","crop":[297,113,1009,378],"marks":[[315,191,487,236,"Product ini mewajibkan subscription."],[315,321,568,372,"Product hanya berisi API Project Y."]]},
  "y-07": {"title":"Subscription key Project Y","crop":[275,209,1044,417],"marks":[[320,301,478,338,"Gunakan subscription Project Y. Jangan memakai key Main atau X."],[792,301,1028,338,"Scope mengarah ke product Project Y dan statusnya Active."]]},
  "y-08-iam": {"title":"Hak APIM pada Project Y","crop":[4,140,1210,479],"marks":[[48,404,1002,468,"Managed Identity APIM mendapat Foundry User di scope project Y."]]},
  "y-09": {"title":"HTTP 200 Y dari uji API langsung","crop":[295,126,1240,430],"marks":[[595,372,1190,413,"Percobaan dari client HTTP untuk Y mendapat 200. Jangan disamakan dengan tes dari browser."]]},
  "main-browser": {"title":"Main berhasil dari Web App","crop":[19,455,1380,1225],"marks":[[1009,481,1359,565,"Gateway Main memakai deployment gpt-5.6-sol."],[50,1113,307,1193,"Klik Kirim ke Foundry setelah menulis pesan contoh."],[733,767,1082,817,"HTTP 200 berarti jawaban model berhasil kembali."],[729,1081,1224,1167,"Gunakan ID request APIM ini untuk mencari transaksi di Workbook."]]},
  "x-browser": {"title":"Project X berhasil dari Web App","crop":[19,466,1514,1235],"marks":[[1120,487,1500,571,"Gateway Project X memakai deployment modelprojectX."],[50,1122,308,1200,"Klik Kirim ke Foundry setelah menulis pesan contoh."],[800,773,1144,825,"HTTP 200 berarti jawaban model berhasil kembali."],[796,1087,1289,1171,"Salin ID request APIM untuk mencocokkan hasil di Azure Portal."]]},
  "y-browser": {"title":"Project Y berhasil dari Web App","crop":[19,455,1380,1225],"marks":[[1009,481,1359,565,"Gateway Project Y memakai deployment modelprojectY."],[50,1113,307,1193,"Klik Kirim ke Foundry setelah menulis pesan contoh."],[733,767,1082,817,"HTTP 200 berarti jawaban model berhasil kembali."],[729,1081,1225,1167,"Salin ID request APIM untuk mencocokkan hasil di Azure Portal."]]}
};

const apimWorkshopMenuSources = {
  api: 'https://learn.microsoft.com/en-us/azure/api-management/add-api-manually',
  policy: 'https://learn.microsoft.com/en-us/azure/api-management/set-edit-policies',
  products: 'https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-add-products',
  subscriptions: 'https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-create-subscriptions',
  identity: 'https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-use-managed-service-identity',
  logger: 'https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-app-insights',
  settings: 'https://learn.microsoft.com/en-us/azure/app-service/configure-common',
  authentication: 'https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-aad',
  workspace: 'https://learn.microsoft.com/en-us/azure/azure-monitor/app/create-workspace-resource',
  foundry: 'https://learn.microsoft.com/en-us/azure/foundry/how-to/diagnostic-logging',
  workbooks: 'https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-overview',
  logs: 'https://learn.microsoft.com/en-us/azure/azure-monitor/logs/log-analytics-overview',
  group: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resource-groups-portal',
  deployments: 'https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-history',
};
const apimWorkshopResourceScope = '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg_demo_pamadigi';
const apimWorkshopGateway = 'apim-pamadigi-chat-432xhdd';
const apimWorkshopWorkspace = 'log-foundrydemoresourcedigi1-be5que3gzucd6';
const apimWorkshopPortal = path => `https://portal.azure.com/#resource${apimWorkshopResourceScope}${path}`;
const apimWorkshopGatewayUrl = apimWorkshopPortal(`/providers/Microsoft.ApiManagement/service/${apimWorkshopGateway}/overview`);
const apimWorkshopWorkspaceUrl = apimWorkshopPortal(`/providers/Microsoft.OperationalInsights/workspaces/${apimWorkshopWorkspace}/overview`);

function setApimShotLocation(ids, location) {
  for (const id of ids) {
    if (!apimWorkshopShots[id]) throw new Error(`Screenshot tidak terdaftar: ${id}`);
    apimWorkshopShots[id].location = { checked: '20 November 2026', ...location };
  }
}

setApimShotLocation(['01-rg'], {
  resource: 'Resource group · rg_demo_pamadigi', url: apimWorkshopPortal('/overview'),
  menu: ['Cari Resource groups di pencarian atas Portal', 'Pilih rg_demo_pamadigi', 'Overview'],
  where: 'Tabel resource di tengah halaman. Cari tipe API Management service dan Application Insights.',
  expected: 'Gateway dan App Insights berada di resource group ini.',
  reference: apimWorkshopMenuSources.group,
});
setApimShotLocation(['02-foundry'], {
  resource: 'Foundry · foundrydemoresourcedigi1',
  url: apimWorkshopPortal('/providers/Microsoft.CognitiveServices/accounts/foundrydemoresourcedigi1/overview'),
  menu: ['Cari foundrydemoresourcedigi1 di pencarian atas Portal', 'Overview'],
  where: 'Ringkasan account Foundry. Nama resource dan lokasi ada pada bagian Essentials.',
  expected: 'Account foundrydemoresourcedigi1 di East US. Daftar project ada di screenshot Projects yang terpisah.',
  reference: apimWorkshopMenuSources.foundry,
});
setApimShotLocation(['03-projects'], {
  resource: 'Foundry · foundrydemoresourcedigi1',
  url: apimWorkshopPortal('/providers/Microsoft.CognitiveServices/accounts/foundrydemoresourcedigi1/overview'),
  menu: ['Cari foundrydemoresourcedigi1 di pencarian atas Portal', 'Resource Management → Projects'],
  where: 'Tabel project pada resource account Foundry, bukan halaman Microsoft Foundry Studio.',
  expected: 'rg_demo_pamadigi-proj1 (Main), pamadigiproject1_proj1 (X), dan pamadigiproject1_proj2 (Y).',
  reference: apimWorkshopMenuSources.foundry,
  evidence: 'Jalur Projects terlihat pada screenshot Portal 19 November 2026; bukan klaim verifikasi UI live. Dokumentasi Foundry terkait diperiksa 20 November.',
});
setApimShotLocation(['04-f1'], {
  resource: 'App Service plan · asp-pamadigi-apim-432xhdd',
  url: apimWorkshopPortal('/providers/Microsoft.Web/serverfarms/asp-pamadigi-apim-432xhdd/overview'),
  menu: ['Cari asp-pamadigi-apim-432xhdd di pencarian atas Portal', 'Overview'],
  where: 'Ringkasan App Service plan, bukan halaman Web App. Periksa OS, lokasi, dan pricing tier.',
  expected: 'Plan Linux F1 di East Asia dipakai bersama oleh tiga Web App.',
  reference: 'https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage',
});
setApimShotLocation(['05-apim-deployment'], {
  resource: 'Resource group · rg_demo_pamadigi', url: apimWorkshopPortal('/deployments'),
  menu: ['Cari rg_demo_pamadigi di pencarian atas Portal', 'Settings → Deployments', 'Pilih pamadigi-apim-lab-gateway'],
  where: 'Daftar deployment di resource group; ini bukan menu Deployments pada model Foundry.',
  expected: 'Status deployment gateway adalah Succeeded.',
  reference: apimWorkshopMenuSources.deployments,
});
setApimShotLocation(['06-apim-overview'], {
  resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
  menu: [`Cari ${apimWorkshopGateway} di pencarian atas Portal`, 'Overview'],
  where: 'Bagian Essentials. Gateway URL adalah awalan Base URL client, bukan alamat backend Foundry.',
  expected: 'Gateway berakhiran azure-api.net; tier Consumption, East Asia.',
  reference: apimWorkshopMenuSources.api,
});
setApimShotLocation(['07-apim-identity'], {
  resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
  menu: [`Cari ${apimWorkshopGateway} di pencarian atas Portal`, 'Security → Managed identities', 'System assigned'],
  where: 'Tab System assigned, kontrol Status. Tombol Azure role assignments ada pada bagian Permissions.',
  expected: 'Status On. Key client dan login pengguna Web App bukan identity ini.',
  reference: apimWorkshopMenuSources.identity,
});
setApimShotLocation(['08-native-diagnostics'], {
  resource: 'Foundry · foundrydemoresourcedigi1',
  url: apimWorkshopPortal('/providers/Microsoft.CognitiveServices/accounts/foundrydemoresourcedigi1/overview'),
  menu: ['Cari foundrydemoresourcedigi1 di pencarian atas Portal', 'Monitoring → Diagnostic settings', 'Pilih setting yang ada → Edit setting; atau + Add diagnostic setting'],
  where: 'Kategori log di kiri; Destination details → Send to Log Analytics workspace di kanan.',
  expected: `Request and Response Logs + Azure OpenAI Request Usage menuju ${apimWorkshopWorkspace}.`,
  reference: apimWorkshopMenuSources.foundry,
});
setApimShotLocation(['09-appinsights'], {
  resource: 'Application Insights · appi-foundrydemoresourcedigi1-9551',
  url: apimWorkshopPortal('/providers/Microsoft.Insights/components/appi-foundrydemoresourcedigi1-9551/overview'),
  menu: ['Cari appi-foundrydemoresourcedigi1-9551 di pencarian atas Portal', 'Overview → Essentials → Logs workspace'],
  where: 'Link Logs workspace pada ringkasan. Untuk mengganti tujuan, buka Properties → Change workspace.',
  expected: `Link workspace menunjuk ${apimWorkshopWorkspace}. Jangan membuka connection string untuk mengikuti panduan.`,
  reference: apimWorkshopMenuSources.workspace,
});
setApimShotLocation(['10-apim-logger'], {
  resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
  menu: [`Cari ${apimWorkshopGateway} di pencarian atas Portal`, 'Monitoring → Application Insights'],
  where: 'Daftar logger di tengah halaman. + Add membuka formulir koneksi Application Insights.',
  expected: 'Logger pamadigi-appinsights tercantum. Logger dengan Managed Identity pada lab dibuat melalui Bicep, bukan formulir + Add biasa.',
  reference: apimWorkshopMenuSources.logger, implementation: '../infra/apim-lab/gateway.bicep',
});
setApimShotLocation(['11-apim-diagnostics'], {
  resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
  menu: [`Cari ${apimWorkshopGateway} di pencarian atas Portal`, 'APIs → APIs', 'All APIs → Settings', 'Gulir ke Diagnostics Logs → Application Insights'],
  where: 'Aktifkan Enable, pilih Destination pamadigi-appinsights, Sampling 100%, dan verbosity Information. Ini bukan menu Monitoring → Diagnostic settings untuk log Azure Monitor.',
  expected: 'Payload request/response 0 byte dan tidak mencatat header key. Simpan hanya jika memang sedang mengubah konfigurasi.',
  reference: apimWorkshopMenuSources.logger,
});

const apimWorkbookLocation = {
  resource: 'Azure Workbook · PAMA Digi · APIM dan Foundry',
  url: apimWorkshopPortal('/providers/Microsoft.Insights/workbooks/43b97e45-3fd6-572a-8077-f700f303ce7f/workbook'),
  menu: ['Cari Azure Workbooks di pencarian atas Portal', 'Pilih PAMA Digi · APIM dan Foundry (ID 43b97e45-3fd6-572a-8077-f700f303ce7f)', 'Menu Workbook'],
  reference: apimWorkshopMenuSources.workbooks,
  evidence: 'Pintu masuk Azure Workbooks terlihat di Home Portal pada 20 November 2026. Panel mengikuti definisi workbook lab; screenshot hasil berasal dari 19 November. Dokumen Workbooks diperiksa 20 November.',
};
setApimShotLocation(['12-cross-key', '15-kql-one-request', 'main-09', 'x-09', 'y-09', '19-workbook-apim-requests'], {
  ...apimWorkbookLocation,
  menu: [...apimWorkbookLocation.menu, 'Panel 3 · Cari satu request lewat IdGateway'],
  where: 'Tabel panel 3 di area tengah workbook. Gulir horizontal ke kanan untuk IdGateway dan IdFoundry; bukan halaman Logs.',
  expected: 'Request sukses memiliki pasangan ID; key tertukar ditolak dan tidak mempunyai usage model.',
});
setApimShotLocation(['13-kql-traffic', '16-workbook'], {
  ...apimWorkbookLocation,
  menu: [...apimWorkbookLocation.menu, 'Panel 1 · Traffic API Management'],
  where: 'Tabel pertama di bawah judul workbook. Angka Sukses/Ditolak berasal dari query panel.',
  expected: 'Traffic terpisah menurut Aplikasi dan Rute.',
});
setApimShotLocation(['14-kql-usage'], {
  ...apimWorkbookLocation,
  menu: [...apimWorkbookLocation.menu, 'Panel 2 · Token dan estimasi penggunaan model'],
  where: 'Gulir ke tabel kedua. Pada gambar, sebagian kolom kiri sudah digulir horizontal.',
  expected: 'Input/output/total token memakai satu sumber; estimasi kosong jika syarat data tidak terpenuhi.',
});
setApimShotLocation(['18-workbook-native-requests'], {
  ...apimWorkbookLocation,
  resource: 'Azure Workbook · PAMA DIGI - Verified Foundry Usage (Direct)',
  url: apimWorkshopPortal('/providers/Microsoft.Insights/workbooks/5a4f923d-3fc5-4d82-b497-040d848d4418/workbook'),
  menu: [apimWorkbookLocation.menu[0], 'Pilih PAMA DIGI - Verified Foundry Usage (Direct) (ID 5a4f923d-3fc5-4d82-b497-040d848d4418)', 'Menu Workbook', 'Panel Request explorer'],
  where: 'Request explorer adalah panel di dalam workbook lama, bukan menu kiri Portal. Cari CorrelationId pada tabelnya.',
  expected: 'CorrelationId native sama dengan IdFoundry workbook baru. Caller unknown adalah hasil query lama.',
});
setApimShotLocation(['17-kql-browser-requests', '20-kql-foundry-caller'], {
  resource: `Log Analytics workspace · ${apimWorkshopWorkspace}`, url: apimWorkshopWorkspaceUrl,
  menu: [`Cari ${apimWorkshopWorkspace} di pencarian atas Portal`, 'Logs', 'Pilih KQL mode → tempel query → Run'],
  where: 'Grid hasil di bawah editor. Gambar 17 memfilter ID browser; gambar 20 memakai query caller pada bagian 4 materi.',
  expected: 'Atur waktu yang mencakup tes. Screenshot memakai data 19 November, bukan hasil query live.',
  reference: apimWorkshopMenuSources.logs,
});
setApimShotLocation(['21-create-http-x'], {
  resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
  menu: [`Cari ${apimWorkshopGateway} di pencarian atas Portal`, 'APIs → APIs → + Add API', 'Pilih tile HTTP'],
  where: 'Form Create an HTTP API: Display name, Name, dan API URL suffix. Gambar ini contoh form yang belum disimpan.',
  expected: 'Name project-x, suffix project-x/openai/v1. Web service URL kosong karena policy menetapkan backend.',
  reference: apimWorkshopMenuSources.api,
});
setApimShotLocation(['22-x-policy-model', '23-x-policy-route'], {
  resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
  menu: [`Cari ${apimWorkshopGateway} di pencarian atas Portal`, 'APIs → APIs → PAMA Digi - Project X', 'Design → All operations', 'Inbound processing → ikon </> (code editor)'],
  where: 'Editor XML policy pada scope API. Gambar 22 menunjuk field model; gambar 23 menunjuk host, rewrite-uri, dan token Managed Identity.',
  expected: 'Host Foundry + path project X + modelprojectX. Potongan gambar bukan pengganti seluruh policy.',
  reference: apimWorkshopMenuSources.policy, implementation: '../infra/apim-lab/route-policy.xml',
});
setApimShotLocation(['24-x-operation-path'], {
  resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
  menu: [`Cari ${apimWorkshopGateway} di pencarian atas Portal`, 'APIs → APIs → PAMA Digi - Project X', 'Design → pilih Chat Completions', 'Kartu Frontend'],
  where: 'Kartu Frontend di area Design. Untuk menambah operasi, gunakan + Add operation.',
  expected: 'POST /chat/completions. Ini path operasi, bukan seluruh Base URL.',
  reference: apimWorkshopMenuSources.api,
});

for (const profile of [
  { id: 'main', label: 'Main', path: 'main', project: 'rg_demo_pamadigi-proj1' },
  { id: 'x', label: 'Project X', path: 'project-x', project: 'pamadigiproject1_proj1' },
  { id: 'y', label: 'Project Y', path: 'project-y', project: 'pamadigiproject1_proj2' },
]) {
  const app = `pamadigi-chat-${profile.id}-432xhdd`;
  const appRoot = { resource: `Web App · ${app}`, url: apimWorkshopPortal(`/providers/Microsoft.Web/sites/${app}/overview`) };
  const findApp = `Cari ${app} di pencarian atas Portal`;
  const findApi = [`Cari ${apimWorkshopGateway} di pencarian atas Portal`, `APIs → APIs → PAMA Digi - ${profile.label}`];
  setApimShotLocation([`${profile.id}-01`], {
    ...appRoot, menu: [findApp, 'Overview → Essentials → Default domain'],
    where: 'Ringkasan Web App, bukan App Service plan. Link Default domain membuka UI aplikasi.',
    expected: `Hostname menunjuk ${app}.azurewebsites.net.`,
    reference: apimWorkshopMenuSources.settings,
  });
  setApimShotLocation([`${profile.id}-02`], {
    ...appRoot, menu: [findApp, 'Settings → Authentication', 'Authentication settings → Edit'],
    where: 'Pengaturan akses UI: Require authentication dan aksi untuk request tanpa sesi.',
    expected: 'Login Microsoft untuk membuka demo. Ini terpisah dari subscription key APIM.',
    reference: apimWorkshopMenuSources.authentication,
  });
  setApimShotLocation([`${profile.id}-03`], {
    ...appRoot, menu: [findApp, 'Settings → Environment variables', 'Tab App settings'],
    where: 'Tabel App settings: APIM_BASE_URL dan APIM_SUBSCRIPTION_KEY. Tidak perlu memilih Show value.',
    expected: `URL memakai /${profile.path}/openai/v1 dan key subscription pamadigi-${profile.path}.`,
    reference: apimWorkshopMenuSources.settings,
  });
  setApimShotLocation([`${profile.id}-04`], {
    resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
    menu: [...findApi, 'Settings'],
    where: 'Base URL pada pengaturan API. Subscription required ada di bagian Subscription.',
    expected: `Suffix ${profile.path}/openai/v1; subscription wajib dengan nama header api-key.`,
    reference: apimWorkshopMenuSources.api,
  });
  setApimShotLocation([`${profile.id}-05`], {
    resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
    menu: [...findApi, 'Design → pilih Chat Completions'],
    where: 'Daftar operasi di kiri area Design dan kartu Frontend di kanan. Untuk policy API, pilih All operations dahulu.',
    expected: 'Operasi POST /chat/completions tersedia.',
    reference: apimWorkshopMenuSources.api,
  });
  setApimShotLocation([`${profile.id}-06`], {
    resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
    menu: [`Cari ${apimWorkshopGateway} di pencarian atas Portal`, `APIs → Products → PAMA Digi - ${profile.label}`, 'APIs'],
    where: 'Daftar API di dalam product, bukan daftar semua API pada gateway. Product baru dibuat dari Products → + Add.',
    expected: `Product pamadigi-${profile.path} Published dan hanya memuat API ${profile.path}.`,
    reference: apimWorkshopMenuSources.products,
  });
  setApimShotLocation([`${profile.id}-07`], {
    resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
    menu: [`Cari ${apimWorkshopGateway} di pencarian atas Portal`, 'APIs → Subscriptions', `Cari pamadigi-${profile.path}`],
    where: 'Kolom Scope dan State di tabel subscription. + Add subscription membuka form baru; jangan membuka key untuk mengikuti screenshot.',
    expected: `Scope product ${profile.label}, status Active. Hindari built-in all-access.`,
    reference: apimWorkshopMenuSources.subscriptions,
  });
  setApimShotLocation([`${profile.id}-08-iam`], {
    resource: `API Management · ${apimWorkshopGateway}`, url: apimWorkshopGatewayUrl,
    menu: [`Cari ${apimWorkshopGateway} di pencarian atas Portal`, 'Security → Managed identities → System assigned', 'Permissions → Azure role assignments'],
    where: `Daftar role milik identity APIM. Periksa baris Foundry User dengan scope project ${profile.project}.`,
    expected: 'Ini daftar role APIM, bukan IAM pengguna browser. Assignment project lab dibuat oleh gateway.bicep; jangan mengasumsikan tiap blade project punya menu IAM.',
    reference: apimWorkshopMenuSources.identity, implementation: '../infra/apim-lab/gateway.bicep',
  });
  setApimShotLocation([`${profile.id}-browser`], {
    ...appRoot, menu: [findApp, 'Overview → Default domain', 'Login Microsoft → halaman demo', 'Tulis pesan → Kirim ke Foundry'],
    where: 'Ini UI Web App, bukan Azure Portal. Hasil dan ID request tampil setelah jawaban model kembali.',
    expected: 'Bukti lab: HTTP 200, 21 token input + 12 output. Salin ID APIM untuk mencarinya di workbook baru.',
    reference: '../apps/apim-chat-lab/server.mjs', referenceLabel: 'Kode aplikasi demo',
    evidence: 'Menu Portal: Microsoft Learn; kontrol aplikasi: kode lab. Gambar hasil uji 19 November 2026.',
  });
}

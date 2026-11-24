export const fps = 30;
export const width = 1920;
export const height = 1080;

const diagram = 'architecture.png';
const shot = (image, heading, caption, seconds = 4) => ({
  image: `${image}.png`, heading, caption, frames: seconds * fps,
});
const profiles = [
  { id: 'main', name: 'Main', model: 'gpt-5.6-sol' },
  { id: 'x', name: 'Project X', model: 'modelprojectX' },
  { id: 'y', name: 'Project Y', model: 'modelprojectY' },
];

export const scenes = [
  { image: diagram, heading: 'Tiga key, satu Foundry', caption: 'Vendor hanya punya Base URL dan API key.\nPisahkan key di APIM, bukan di Foundry.', frames: 6 * fps },
  shot('01-rg', '01 / Resource group', 'Temukan semua resource demo di\nrg_demo_pamadigi.'),
  shot('02-foundry', '02 / Microsoft Foundry', 'Pakai satu Foundry yang sudah ada.\nKey bawaan Foundry tetap nonaktif.'),
  shot('03-projects', '03 / Tiga project', 'APIM memilih project tujuan.\nModelnya tetap di resource yang sama.'),
  shot('04-f1', '04 / Hosting', 'Satu App Service Free plan\nuntuk tiga Web App.'),
  shot('05-apim-deployment', '05 / Deployment', 'Cek deployment APIM di Azure Portal.\nLab ini dibuat dengan Bicep.'),
  shot('06-apim-overview', '06 / Gateway', 'APIM Consumption ada di East Asia.\nBase URL vendor berasal dari gateway.'),
  shot('07-apim-identity', '07 / Managed Identity', 'Nyalakan System assigned di APIM.\nAPIM tidak menyimpan key Foundry.'),
  ...profiles.map((p) => shot(`${p.id}-08-iam`, `IAM / ${p.name}`, 'Berikan role Foundry User ke APIM.\nScope-nya hanya project tujuan.')),
  shot('08-native-diagnostics', '08 / Log Foundry', 'Foundry sudah mengirim log usage\nke workspace yang sama.'),
  shot('09-appinsights', '09 / Application Insights', 'Cocokkan workspace yang terhubung.\nTidak perlu workspace baru.'),
  shot('10-apim-logger', '10 / Logger APIM', 'APIM mengirim metadata\nke Application Insights.'),
  shot('11-apim-diagnostics', '11 / Metadata saja', 'Body request dan response: 0 byte.\nJangan catat prompt, key, atau token.'),
  ...profiles.flatMap((p) => [
    shot(`${p.id}-01`, `${p.name} / Web App`, 'Buka default domain aplikasi ini.\nKetiga aplikasi punya URL berbeda.'),
    shot(`${p.id}-02`, `${p.name} / Login`, 'Entra melindungi UI demo.\nVendor tidak perlu login UI.'),
    shot(`${p.id}-03`, `${p.name} / Setting server`, 'Simpan Base URL dan key di server.\nBrowser tidak menerima key.'),
    shot(`${p.id}-04`, `${p.name} / Base URL`, `Ini Base URL APIM untuk ${p.name}.\nSubscription wajib diaktifkan.`),
    shot(`${p.id}-05`, `${p.name} / Operasi`, `POST /chat/completions.\nAPIM memilih ${p.model}.`),
    shot(`${p.id}-06`, `${p.name} / Product`, 'Satu product, satu API.\nBatas: 5 per menit dan 100 total.'),
    shot(`${p.id}-07`, `${p.name} / Subscription`, `Key untuk ${p.name} tidak dibagi.\nYang terlihat hanya nama dan scope.`),
    { ...shot(`${p.id}-browser`, `${p.name} / Uji dari Web App`,
      'Klik Kirim ke Foundry: HTTP 200.\nCatat 33 token dan ID request APIM.', 7), source: 'webapp' },
  ]),
  shot('12-cross-key', '12 / Uji API langsung: key tertukar', 'Key X dipakai ke endpoint Y.\nAPIM menolak sebelum memanggil model.', 5),
  shot('13-kql-traffic', '13 / Traffic', 'APIM mencatat rute dan status.\nBandingkan yang sukses dan ditolak.', 5),
  shot('14-kql-usage', '14 / Pemakaian model', 'Foundry mencatat deployment dan token.\nJangan jumlahkan dua sumber token.', 5),
  shot('17-kql-browser-requests', '15 / Azure Portal: cari tiga ID dari browser', 'Tiga request Web App cocok dengan Foundry.\nMain, X, dan Y: 33 token per request.', 8),
  shot('19-workbook-apim-requests', '16 / Workbook baru: APIM dan Foundry', 'Workbook baru mencocokkan IdGateway\nke IdFoundry untuk melacak tiap rute.', 8),
  shot('18-workbook-native-requests', '17 / Workbook lama: Foundry Usage (Direct)', 'Tiga request tadi muncul di Workbook lama.\nCocokkan CorrelationId dari log Foundry.', 8),
  shot('20-kql-foundry-caller', '18 / Caller yang dilihat Foundry', 'ID caller cocok dengan identitas APIM.\nBukan identitas pengguna Web App.', 8),
  shot('16-workbook', '19 / Satu workspace, dua tampilan', 'Buka dua Workbook di workspace yang sama.\nCocokkan ID, jangan jumlahkan token.', 6),
];

export const totalFrames = (sequence) => sequence.reduce((sum, scene) => sum + scene.frames, 0);

# Storyboard: tiga key, satu Foundry

Video senyap: **teks Indonesia di layar, tanpa narasi, musik, atau audio track**. Visual setup dan laporan berasal dari Azure Portal. Hasil klik berasal dari tiga Web App live. Diagram hanya menjelaskan alur.

**Hasil:** [video MP4 senyap](apim-foundry-demo.mp4), 3:40. Tiga Web App mendapat `200`. Ketiga request itu tampil di dua Workbook. Adegan `401` memakai percobaan API langsung yang terpisah.

## Render setelah PNG asli siap

Simpan hasil crop dan redaksi permanen dengan nama di shot list. Jalankan dari folder [renderer](renderer/):

```powershell
npm run check -- "..\..\assets"
npm run render -- "..\..\assets" "..\apim-foundry-demo-preview.mp4"
```

`check` menampilkan file yang belum lengkap. Cek isi gambar dan redaksi sebelum render. Renderer mengambil tangkapan dari folder `apim-foundry-portal` dan `apim-foundry-webapps`, lalu memakai diagram Azure dan teks dari [urutan adegan](renderer/scenes.mjs). Kalau path kedua tidak diisi, hasilnya ditulis ke `apim-foundry-demo.mp4`. Render ke path baru dulu, periksa hasilnya, baru ganti video final. Prosesnya lokal.

## Cerita dan urutan teks layar

| Adegan | Teks di layar, sesuai urutan | Visual yang dipakai |
|---|---|---|
| 01 · Masalah | “Vendor hanya punya Base URL dan API key.” / “Tiga aplikasi perlu tiga key. Foundry tetap satu.” | Diagram Azure, lalu `01-rg`, `02-foundry`, `03-projects`. |
| 02 · Hosting | “Satu App Service Free plan untuk tiga Web App.” / “Login Entra hanya untuk UI demo.” | `04-f1`; Overview dan Authentication untuk Main, X, dan Y. |
| 03 · Gateway | “APIM Consumption memeriksa key dan memilih rute.” | `05-apim-deployment`, `06-apim-overview`, `07-apim-identity`. |
| 04 · Backend | “APIM masuk ke Foundry dengan Managed Identity.” / “Izin Foundry diberikan per project.” | `main-08-iam`, `x-08-iam`, `y-08-iam`; crop panah Entra di diagram. |
| 05 · Siapkan log | “APIM → Application Insights → Log Analytics.” / “Foundry juga mengirim log ke workspace yang sama.” | `08-native-diagnostics`, `09-appinsights`, `10-apim-logger`, `11-apim-diagnostics`. |
| 06 · Main | “Base URL dan key Main.” / “APIM memilih gpt-5.6-sol.” / “Klik Kirim ke Foundry: HTTP 200. Catat 33 token dan ID request APIM.” | `main-01` sampai `main-07` dari Portal, lalu `main-browser` (01:30). |
| 07 · Project X | “Base URL dan key X.” / “APIM memilih modelprojectX.” / “Klik Kirim ke Foundry: HTTP 200. Catat 33 token dan ID request APIM.” | `x-01` sampai `x-07` dari Portal, lalu `x-browser` (02:05). |
| 08 · Project Y | “Base URL dan key Y.” / “APIM memilih modelprojectY.” / “Klik Kirim ke Foundry: HTTP 200. Catat 33 token dan ID request APIM.” | `y-01` sampai `y-07` dari Portal, lalu `y-browser` (02:40). |
| 09 · Isolasi | “Key X dipakai ke endpoint Y.” / “HTTP 401: APIM menolak sebelum model dipanggil.” | `12-cross-key`: grid Logs yang menampilkan rute `project-y`, aplikasi `Project X`, status `401`, dan tidak ada respons model. |
| 10 · Pelaporan | “APIM mencatat rute dan status.” / “Foundry mencatat deployment dan token.” / “Tiga request Web App cocok dengan Foundry.” | `13-kql-traffic`, `14-kql-usage`, lalu `17-kql-browser-requests` (03:02). |
| 11 · Dua Workbook | “Workbook baru mencocokkan IdGateway ke IdFoundry.” / “Tiga request tadi muncul di Workbook lama.” | `19-workbook-apim-requests` (03:10), lalu `18-workbook-native-requests` (03:18). |
| 12 · Caller | “ID caller cocok dengan identitas APIM. Bukan identitas pengguna Web App.” | `20-kql-foundry-caller` (03:26). Ini hasil query **Logs**, bukan kolom `Caller` di Workbook lama. |
| 13 · Penutup | “Buka dua Workbook di workspace yang sama. Cocokkan ID, jangan jumlahkan token.” | `16-workbook` (03:34). |

## Shot list operator

Tabel ini berisi tangkapan dari **portal.azure.com**. Ambil layar sesuai langkah, bukan rekonstruksi. Bila setup dilakukan lewat Bicep, tampilkan hasil deploy atau konfigurasi yang terlihat, bukan seolah-olah mengeksekusi Bicep lewat klik.

| Nama file | Buka | Sorot sebelum menyimpan |
|---|---|---|
| `01-rg.png` | Resource groups → `rg_demo_pamadigi` → Overview | Baris Foundry yang dipakai, APIM, App Service plan, dan tiga Web Apps. |
| `02-foundry.png` | `foundrydemoresourcedigi1` → Overview | Nama akun dan East US. Jangan buka Keys and Endpoint. |
| `03-projects.png` | Foundry resource → Resource Management → Projects | Tiga nama project. Jika daftar tidak tampil, pakai Resource group atau Deployments yang menampilkan resource anak. |
| `04-f1.png` | App Service plan → Overview | Linux, F1, East Asia. |
| `05-apim-deployment.png` | Resource group → Deployments → `pamadigi-apim-lab-gateway` | `Succeeded`. Untuk pilihan SKU/region, gunakan blade Overview atau form yang belum disimpan. |
| `06-apim-overview.png` | APIM → Overview | Consumption, East Asia, Gateway URL. Crop data publisher. |
| `07-apim-identity.png` | APIM → Identity → System assigned | Status On. Redaksi identifier jika tidak diperlukan. |
| `08-native-diagnostics.png` | Foundry → Diagnostic settings → setting yang aktif | `RequestResponse`, `AzureOpenAIRequestUsage`, nama workspace tujuan. |
| `09-appinsights.png` | Application Insights → Overview/IAM | Nama workspace dan role ingest (ambil crop terpisah). Jangan tampilkan connection string. |
| `10-apim-logger.png` | APIM → Monitoring → Application Insights | Nama logger yang sudah tersambung. Jangan pilih Show instrumentation key. |
| `11-apim-diagnostics.png` | APIM → APIs → All APIs → Settings → Diagnostics Logs | Destination, logging error, dan 0 bytes untuk body request/response di frontend/backend. |
| `12-cross-key.png` | LAW → Logs | Baris transaksi `2c3f430b-60b0-4e0c-a252-ce2f5090c22d` dari uji 19 November 2026, 14:19 UTC, atau ID run baru yang setara. |
| `13-kql-traffic.png` | LAW → Logs atau Workbook → Traffic API Management | Main/X/Y serta status sukses dan ditolak, jangan tampilkan tab dengan log mentah. |
| `14-kql-usage.png` | LAW → Logs atau Workbook → Token dan estimasi | Input/output, deployment, dan `SumberToken`. |
| `15-kql-one-request.png` | LAW → Logs | Bukti historis di panduan: Project X dari uji API langsung. Bukan hasil klik Web App. |
| `16-workbook.png` | LAW → Workbooks → PAMA Digi · APIM dan Foundry | Nama Workbook dan panel yang memuat hasil. |
| `17-kql-browser-requests.png` | LAW → Logs | Ketiga `IdGateway` dari browser, HTTP 200 dan 33 token native per request. |
| `19-workbook-apim-requests.png` | Workbook baru → 3 · Cari satu request lewat IdGateway | Tiga pasangan `IdGateway` dan `IdFoundry` berstatus **Cocok**. |
| `18-workbook-native-requests.png` | Workbook lama → Request explorer | Tiga `CorrelationId` sama dengan `IdFoundry` di Workbook baru. Token terisi; `Caller` dan `Project` tampil `unknown`. |
| `20-kql-foundry-caller.png` | LAW → Logs → KQL mode | Perbandingan `callerObjectId` dan `objectId` di `RequestResponse` dengan principal APIM. Tampilkan hasil `true`, bukan nilai identitas atau alamat IP. |

### Ulangi set ini untuk Main, Project X, dan Project Y

Simpan tiga set terpisah (`main-01.png`, `x-01.png`, `y-01.png`, dan seterusnya).

| Sufiks | Layar dan kontrol |
|---|---|
| `-01` | Web App → Overview → Default domain. Tunjukkan tiga hostname yang berbeda di tiga set. |
| `-02` | Web App → Authentication. Sorot penyedia Entra dan require authentication, bukan user atau ID tenant. |
| `-03` | Web App → Environment variables. Hanya nama `APIM_BASE_URL`, `APIM_SUBSCRIPTION_KEY`; nilai key dan `AAD_CLIENT_SECRET` harus tertutup. |
| `-04` | APIM → APIs → API masing-masing → Settings. Sorot Base URL/path, `Subscription required`, dan nama header. |
| `-05` | APIM → APIs → Design → `POST /chat/completions` → Inbound processing. Sorot project/deployment dan Managed Identity. |
| `-06` | APIM → Products → product untuk app → APIs. Hanya satu API terkait; policy menunjukkan 5 per menit dan 100 panggilan. |
| `-07` | APIM → Subscriptions. Sorot alias dan scope. **Jangan buka key**; tulisan `<APIM_KEY_MAIN>`, `<APIM_KEY_X>`, dan `<APIM_KEY_Y>` adalah placeholder untuk video. |
| `-08-iam` | APIM → Managed identities → System assigned → Azure role assignments. Sorot baris Foundry User dengan scope project yang cocok. |
| `-09` | Hasil `200` dari uji API langsung. Dipertahankan sebagai bukti terpisah di panduan, bukan adegan hasil browser. |
| `-browser` | Setelah klik **Kirim ke Foundry**, tangkap jawaban, HTTP 200, token, dan ID. Simpan di `apim-foundry-webapps` karena sumbernya Web App, bukan Portal. |

## Jalankan sebelum capture hasil

1. Masuk ke masing-masing Web App dengan akun operator. Tekan **Kirim ke Foundry** dengan prompt fiktif yang sama: “Balas satu kalimat: uji koneksi PAMA Digi berhasil.”
2. Ikuti ketiga request ke Workbook baru lewat `IdGateway`. Pakai `IdFoundry` untuk menemukan `CorrelationId` yang sama di Workbook lama. Untuk X: `df5d6b03-1f6e-4f88-87ed-99f43a9c22ed` → `1592b053-85b0-4ecd-991b-e3ced9aca1e0`. Jika log belum masuk, refresh query setelah ingest. Jangan menebak project atau pengguna dari field yang kosong.
3. Untuk contoh salah key, pakai hasil uji key X ke API Y. Jangan pernah tampilkan nilai key atau header Authorization di screenshot. Jika hasil lama sudah tidak tersedia, ambil ID dari putaran baru.
4. Verifikasi setiap crop sebelum dirakit: tidak ada API key, connection string, token Entra, raw prompt/response, atau data pribadi. Simpan redaksi permanen, bukan blur yang dapat dilepas.
5. Render secara lokal dengan satu frame per tindakan penting, durasi cukup untuk baca label, ukuran teks konsisten, dan resolusi 1080p. Periksa satu frame per adegan, playback, dan tidak ada audio track. Jangan ekspor final jika screenshot wajib belum ada.

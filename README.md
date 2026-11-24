# ModelUsageKQL

Contoh monitoring pemakaian model Microsoft Foundry dengan dua metode:

| Metode | Jalur request | Materi |
|---|---|---|
| Tanpa APIM | Aplikasi langsung ke Foundry | [Workshop monitoring Foundry](docs/workshop-monitoring-foundry.html) |
| Dengan APIM | Aplikasi ke API Management, lalu Foundry | [Workshop APIM + Foundry](docs/workshop-apim-foundry.html) |

Keduanya memakai Log Analytics untuk menyimpan log dan Workbook untuk menampilkan laporan. APIM menambahkan pengaturan akses dan rute; tanpa APIM tetap bisa monitoring pemakaian.

**Isi repo**

- [Ringkasan setup tanpa APIM](docs/workshop-monitoring-foundry-preview.html).
- [KQL native Foundry](queries/foundry-native-usage-cost.kql), [KQL APIM](queries/apim-foundry-report.kql), dan [contoh Workbook direct lama](queries/foundry-verified-direct.kql).
- [Aplikasi chat melalui APIM](apps/apim-chat-lab/) dan [generator trafik/simulasi](demo_usage.py).
- [Template Bicep](infra/), [diagram editable](docs/diagrams/), screenshot pendukung, dan [video demo](docs/video/apim-foundry-demo.mp4).

**Mulai dari lokal, tanpa memanggil Azure**

Unduh atau clone seluruh repo agar aset workshop APIM ikut tersedia:

```powershell
git clone https://github.com/sandy-gunawan/ModelUsageKQL.git
Set-Location ModelUsageKQL
Start-Process .\docs\workshop-monitoring-foundry.html
Start-Process .\docs\workshop-apim-foundry.html
```

GitHub menampilkan source HTML, bukan halaman workshop yang sudah dirender. Buka file hasil unduhan di browser. Workshop native sudah membawa asetnya di dalam HTML; workshop APIM memakai folder aset di sebelahnya.

Untuk pemeriksaan lokal, gunakan Python 3.11+ dan Node.js 24+:

```powershell
python -m unittest test_demo_usage.py
node --test .\apps\apim-chat-lab\server.test.mjs .\docs\video\renderer\render.test.mjs
node .\docs\build-foundry-workshop.mjs
node .\docs\video\renderer\render.mjs --check .\docs\assets
python .\demo_usage.py --limit 3 --run-name contoh-lokal
```

Simulasi memakai data sintetis, tidak memanggil model, dan menyimpan hasil di folder `reports` yang diabaikan Git. Generator dengan tabel custom adalah tambahan demo, bukan syarat monitoring native.

**Sebelum memakai lingkungan Azure sendiri**

- Nama resource dan screenshot di materi adalah contoh historis lab, bukan resource yang otomatis tersedia di subscription pembaca.
- ID subscription pada contoh KQL diganti menjadi `00000000-0000-0000-0000-000000000000`. ID workspace kedua pada query direct lama diganti menjadi `00000000-0000-0000-0000-000000000001`. Ganti placeholder dan inventori deployment sebelum menjalankan query pada data sendiri.
- Sesuaikan model, versi, region, kuota, serta snapshot harga. `EstimasiUSD` bukan tagihan Azure.
- Template [main.bicep](infra/main.bicep) membuat lab generator. Template [APIM](infra/apim-lab/) memakai Foundry/project dan Application Insights yang sudah tersedia; sesuaikan [profiles.json](infra/apim-lab/profiles.json) terlebih dahulu. Ini bukan satu deployment otomatis untuk kedua metode.
- [lab.ps1](infra/apim-lab/lab.ps1) memerlukan PowerShell 7+, Azure CLI yang sudah login, dan parameter `-SubscriptionId`. Gunakan `-ResourceGroupName` bila nama resource group berbeda. `Host` dan `Wire` mengubah konfigurasi Azure; `Smoke` mengirim request model yang dapat berbayar.

**Batas publikasi**

Repo ini tidak menyertakan file environment, kredensial, state Azure lokal, atau laporan hasil run. Semua file `.env*`, termasuk contoh environment, diabaikan oleh Git. Isi kredensial hanya di sesi lokal atau konfigurasi server yang sesuai; jangan menaruhnya di browser, source, screenshot, atau commit.

Sebelum mengunggah perubahan berikutnya, periksa daftar file yang akan di-commit dan jalankan pemindai secret, misalnya `gitleaks dir . --redact`. Screenshot dan video tetap perlu diperiksa karena pemindaian teks saja tidak cukup.

---

Catatan di bawah mempertahankan langkah dan nama resource lab historis sebagai referensi.

Untuk demo tiga API key lewat API Management, buka [workshop APIM + Foundry](docs/workshop-apim-foundry.html). Lab ini punya [KQL laporan terpisah](queries/apim-foundry-report.kql) dan [storyboard video senyap](docs/video/apim-foundry-storyboard.md). Laporan Foundry di bawah tetap berjalan seperti sebelumnya.

Urutan materi APIM: **koneksi → setup → tes → workbook → tambah koneksi**. Diagram pesan dan log dipisahkan; setup X memakai enam langkah. Pilih langkah pada diagram setup untuk menyorot bagian APIM dan resource pendamping yang sedang diatur; tombol menu membuka screenshot terkait. Rincian setting tetap tersedia dalam panel lipat. Seluruh 54 screenshot memiliki popup berisi resource awal, jalur menu, posisi kontrol, hasil yang diharapkan, serta sumber/tanggal pemeriksaan menu. Screenshot adalah bukti lab 19 November; jalur menu dicocokkan dengan dokumentasi Microsoft Learn pada 20 November 2026.

Workbook lama yang dibandingkan adalah **Verified Foundry Usage (Direct)**: log native di LAW utama ditambah data generator di LAW kedua. Workbook APIM baru hanya membaca LAW utama. [KQL Request explorer lama](queries/foundry-verified-direct.kql) adalah salinan definisi Azure dengan parameter waktu untuk Logs, bukan pengganti [KQL native lengkap](queries/foundry-native-usage-cost.kql). Materi tidak mengubah resource atau workbook Azure.

**Menu utamanya ada di Log Analytics workspace → Workbooks.** Workspace menyimpan log request Foundry. Workbook memakai log itu untuk menampilkan tabel dan grafik.

Untuk belajar setup manual dari awal, buka [workshop HTML monitoring Foundry](docs/workshop-monitoring-foundry.html). Materi membedakan jalur usage/tracing, mengajarkan setup LAW dan Application Insights bersama, serta membedah KQL dan seluruh kolom hasilnya.

## 1. Buka Workbook

1. Masuk ke [Azure Portal](https://portal.azure.com), bukan portal Foundry.
2. Di **kotak pencarian paling atas**, ketik **Log Analytics workspaces** dan pilih layanannya.
3. Buka workspace `law-pamadigi-usage-432xhddjb3emq` di resource group `rg_demo_pamadigi`.
4. Di **menu kiri workspace**, buka bagian **Monitoring** dan klik **Workbooks**.
5. Pilih **PAMADIGI - Foundry Usage**.

**Monitor → Workbooks** juga bisa dipakai. Itu daftar global untuk mencari Workbook yang sama. Mulai dari workspace lebih jelas karena kamu langsung tahu log mana yang dipakai.

## 2. Cek sumber data sebelum membuat Workbook

Kamu perlu akses untuk membaca log di workspace dan membuka Workbook. Kalau akan membuat salinan, kamu juga perlu izin membuat Workbook di resource group tujuan.

Di menu kiri **workspace yang sama**, pilih **Logs**. Atur rentang waktu yang mencakup trafik, lalu jalankan:

```kusto
FoundryDemoRequests_CL
| take 5
```

Kalau tabel belum ada, siapkan pengiriman log dulu. Membuat Workbook tidak otomatis mencatat request ke Foundry. Di lab ini, [usage-monitor.bicep](infra/usage-monitor.bicep) menyiapkan workspace, tabel, dan aturan pengiriman log. [demo_usage.py](demo_usage.py) mengirim metadata request ke tabel tersebut saat generator terhubung.

## 3. Buat salinan dengan tampilan yang sama

Salin template dari Workbook lengkap agar filter, tabel, grafik, dan panel biaya ikut terbawa.

1. Di **PAMADIGI - Foundry Usage**, klik **Edit** di bar atas. Di toolbar edit, buka **Advanced Editor** (`</>`).
2. Pilih **Gallery Template** dan salin seluruh JSON. Setelah menyalin, keluar tanpa menyimpan perubahan pada Workbook asli.
3. Kembali ke **Log Analytics workspace → Monitoring → Workbooks**. Di daftar Workbooks, klik **New**. Jika halaman baru belum dalam mode edit, klik **Edit**.
4. Buka **Advanced Editor** (`</>`), pilih **Gallery Template**, dan tempel JSON. Kalau workspace tujuan berbeda, sesuaikan Resource ID seperti di bagian 5 **sebelum** klik **Apply**.
5. Pastikan filter, tabel, dan grafik tampil. Klik **Save** di bar atas. Gunakan nama baru, misalnya **PAMADIGI - Foundry Usage - Salinan**, dan pilih subscription serta resource group tujuan.

Untuk salinan di workspace lab yang sama, sumber datanya tidak perlu diganti. Untuk pembanding, membuat satu query dengan **Visualization: Grid** saja hanya menghasilkan tabel, bukan seluruh Workbook ini.

## 4. Pakai filter dan baca hasilnya

Pilih **Periode**, **Project**, dan **Model** di bagian atas. Filter ini berlaku untuk ringkasan, tabel pemakaian, grafik tren, dan detail request.

| Bagian di Workbook | Isinya |
|---|---|
| **Total pada filter yang dipilih** | Total request dan token yang tercatat. |
| **Request dan token per project × model** | Rincian per project, model, dan deployment, termasuk `EstimasiUSD`. |
| **Tren jumlah request per project** | Grafik request per project dari waktu ke waktu. |
| **100 request terakhir pada filter yang dipilih** | Rincian tiap panggilan yang tercatat. |
| **Biaya tercatat Azure - bulan berjalan** | Biaya resource Foundry dari Azure Cost Management. Panel ini terpisah dan tidak ikut filter project/model. |

`EstimasiUSD` memakai tarif publik input/output dan belum memisahkan tarif cache. Panel **Biaya tercatat Azure** sudah memakai data billing, tetapi bisa terlambat muncul. Kosong bukan berarti nol.

Untuk melihat trafik demo lama, pilih periode yang mencakup **18 November 2026, 13:06–13:16 WIB**, jika lognya masih tersedia. Pilih **Refresh** atau aktifkan **Auto refresh** untuk membaca log baru. Refresh tidak mengirim request ke model.

## 5. Bagikan ke client

**Jika client boleh melihat data lab:** di kotak pencarian atas Portal, buka layanan **Monitor**. Pilih **Workbooks** di menu kiri, centang Workbook, lalu klik **Share** di bar atas dan salin link. Link saja tidak memberi akses. Beri akses baca ke Workbook dan sumber log hanya jika data itu boleh dibagikan. Panel biaya juga perlu izin baca di Azure Cost Management; jangan beri akses billing jika client tidak membutuhkannya.

**Jika client memakai workspace sendiri:** gunakan langkah salin di bagian 3, tetapi buka **workspace client** saat klik **New**. Jangan bagikan JSON yang masih menunjuk langsung ke resource lab. Sesuaikan ini di template:

- **Workspace log:** ganti Resource ID workspace lama pada referensi log, termasuk `fallbackResourceIds` dan `crossComponentResources`. Workspace client perlu tabel `FoundryDemoRequests_CL` dengan kolom sesuai [usage-schema.json](infra/usage-schema.json) serta pengiriman log yang sudah berjalan.
- **Panel biaya Azure:** ganti scope resource group pada URL Cost Management dan Resource ID Foundry pada filter query. Kalau client tidak memerlukan panel ini, hapus panel dari salinan.
- **Filter dan tarif:** sesuaikan daftar Project/Model serta tarif untuk deployment client jika namanya berbeda. `EstimasiUSD` tidak boleh dianggap tagihan.

Cari **Resource ID** dari halaman **Overview → JSON View** pada masing-masing resource di Portal. Templatenya menyalin layout dan query, bukan isi log atau hak akses. Setelah menyimpan, cek lagi bahwa log dan panel biaya mengarah ke resource client.

## 6. Workbook dari log bawaan Foundry

Bagian ini terpisah dari Workbook generator di atas. Gunakan [foundry-native-usage-cost.kql](queries/foundry-native-usage-cost.kql) untuk lab manual yang mengirim `AzureOpenAIRequestUsage` dan `RequestResponse` ke workspace `log-foundrydemoresourcedigi1-be5que3gzucd6`.

1. Buka workspace tersebut → **Workbooks** → Workbook lab → **Edit**.
2. Edit query tabel usage, lalu ganti seluruh KQL dengan isi file tersebut.
3. Pilih sumber **Logs**, workspace yang sama, periode **Last 24 hours**, dan visualisasi **Grid**.
4. Klik **Run Query**, lalu **Done editing → Save**. Tampilkan `EstimasiUSD` dengan delapan angka desimal.

Query menemukan tag seluruh account/project Foundry yang dapat dibaca melalui Azure Resource Graph tanpa daftar nama resource/project. Usage dihubungkan dengan `RequestResponse` memakai Resource ID dan Correlation ID. Satu request dapat memiliki record proxy project dan record model terpisah; query menggabungkan nilai project/ID nonkosong yang unik, bukan memilih satu record dengan `arg_max()`. Project atau ID yang bertentangan ditandai, bukan dipilih acak. Akses tag memerlukan izin baca pada resource terkait. Cross-query Resource Graph masih preview dan dibatasi 1.000 hasil; produksi berskala besar memerlukan inventori/tag terpusat yang disinkronkan.

Secara default, query menampilkan **14 kolom ringkasan**: `ResourceGroup`, `Foundry`, `ProjectTercatat`, `Model`, `Deployment`, `CallerApp`, `CallerName`, `CatatanUsage`, `InputToken`, `OutputToken`, `TotalToken`, `EstimasiUSD`, `StatusHarga`, dan `Tags`. Semua key tag tetap tersedia di `Tags`; label `AppTag`/`ProjectTag` tidak diulang sebagai kolom terpisah. SKU, principal/ID, asal metadata, serta pemeriksaan token/tarif tetap dipakai di dalam pengolahan, hanya tidak ditampilkan.

Untuk **37 kolom detail**, gunakan tombol **Salin KQL detail transaksi** pada [workshop HTML](docs/workshop-monitoring-foundry.html). Jika mengedit manual, ubah `ShowTransactions = true` **dan hapus blok `project` paling akhir** yang ditandai `Compact dashboard output only`; proyeksi lengkap dan pengurutan di atasnya tetap dipertahankan. Mengganti flag saja memisahkan transaksi tetapi belum menampilkan `WaktuUsage`/`RequestId`. Dua request dengan dimensi sama bisa menambah `CatatanUsage` pada baris ringkasan lama, bukan menghasilkan dua baris ringkasan baru. Menyembunyikan kolom tidak menggabungkan dimensi identitas yang berbeda atau mengubah total.

**Harga tidak ditentukan oleh nama deployment.** `modelprojectX`, `modelprojectY`, dan `gpt-5.6-sol` memakai tarif yang sama bila provider, model, versi, SKU, region, dan kelas context-nya sama. Nama deployment hanya dipakai di `DeploymentInventoryInput` untuk menemukan metadata penagihannya.

Inventori adalah snapshot enam deployment lab yang diperiksa pada 18 November 2026; deployment child belum muncul dalam Resource Graph lab ini. Saat menambah/mengubah deployment, perbarui inventori dari control plane, bukan menambahkan harga baru untuk setiap alias. Jika inventori hilang, duplikat, atau tidak cocok dengan model/versi log, estimasi dikosongkan dengan alasan yang terlihat. Jangan memakai SKU account `S0` sebagai SKU deployment.

`PriceInput` berisi snapshot tarif publik USD per 1 juta token dari [Azure Retail Prices API](https://prices.azure.com/api/retail/prices), untuk versi model/SKU/region yang tercantum. Cache read, write 30 menit, write 12 jam, dan long context dipisahkan. Kimi belum diberi harga karena tarif penawarannya belum terverifikasi. Tarif yang tidak ditemukan atau duplikat tidak dianggap nol. Untuk produksi, sinkronkan inventori dan tabel harga beserta periode berlakunya; snapshot harga/metadata saat ini bukan riwayat perubahan SKU maupun kontrak.

**Tag resource bukan bukti aplikasi pemanggil.** Query menggabungkan tag project yang benar-benar tercatat pada request dengan tag account sebagai fallback; tag project menang jika key sama. Ini overlay report, bukan pewarisan tag otomatis Azure. `Tags` memuat seluruh key sehingga tag baru seperti `projectChild` terbaca tanpa menambah kolom/hardcode key. Pada detail, `TagSource` dan `ProjectResourceId` menunjukkan asal metadata, sedangkan `AppTag`/`ProjectTag` membaca key standar `app`/`project`; key lain tidak diubah menjadi project atau caller secara diam-diam. Semua tag adalah kondisi saat query dijalankan; mengganti tag dapat mengubah label histori yang ditampilkan.

`ProjectTercatat` berasal dari seluruh metadata request yang cocok, bukan dari tag atau nama deployment. `StatusProject` membedakan project tercatat, tidak ada konteks, konflik, dan RequestResponse yang belum cocok. Jika semua record request memang tidak menyebut project, query tidak menebaknya dari daftar project dalam account. `PrincipalTercatat` adalah ID dari `callerObjectId` atau `objectId`, bukan otomatis nama orang, agent, atau service; `SumberId` menunjukkan asalnya.

Blok `RequestCallerMetadataInput` sengaja kosong. Nama/tipe agent atau service hanya ditampilkan setelah ada metadata per model call yang tepercaya: Resource ID account, request ID Foundry, ID/tipe/nama pemanggil, serta detail aplikasi/agent/service/user jika tersedia. Request ID harus cocok dengan Correlation ID log; Trace ID Application Insights tidak otomatis sama. Satu principal dapat dipakai beberapa agent, sehingga jangan memetakan principal bersama atau tag resource menjadi nama satu agent. Identitas pengguna akhir juga berbeda dari identity backend. Gunakan ID yang diperlukan saja, jangan simpan access token atau prompt, dan batasi akses report identitas.

Sebelum metadata tersebut tersedia, kolom agent/service kosong atau bertanda belum tercatat; token dan estimasi tetap dihitung. Metadata yang bertentangan ditandai tanpa menggandakan usage. Query ini tidak membuat aplikasi, tabel telemetry, koneksi, role assignment, atau resource Azure baru, dan tidak mengubah Workbook secara otomatis. Panel billing Azure yang terpisah tetap memakai Cost Management, bukan `EstimasiUSD`.

## 7. Materi workshop HTML

Buka [workshop-monitoring-foundry.html](docs/workshop-monitoring-foundry.html) langsung di browser. File hasil render membawa KQL, gambar bukti lab, font berlisensi OFL, CSS, dan JavaScript di dalamnya; tidak perlu server atau koneksi Azure untuk membaca materi. Link Portal/Microsoft Learn tetap memerlukan internet.

Buka [ringkasan setup mini lab](docs/workshop-monitoring-foundry-preview.html#arsitektur) untuk empat langkah: pilih satu LAW pusat, tautkan satu Application Insights, kirim log dari tiap Foundry, lalu jalankan KQL. Diagram berikon Azure punya [sumber Draw.io](docs/diagrams/foundry-setup-ringkas.drawio) yang bisa diedit. Cuplikan portal bisa diperbesar. Bagian **Bukti lab** membedakan screenshot historis dari hasil baca Azure lewat CLI; simulasi dan `EstimasiUSD` bukan tagihan. Mini lab memakai aset lokal, tidak memerlukan build, dan tidak menggantikan workshop lengkap.

Materi menyediakan langkah setup, query dasar/berfilter dengan 14 kolom utama, detail transaksi dengan 37 kolom, penjelasan setiap blok, kamus semua kolom hasil dan konfigurasi, simulator biaya lokal, serta panel billing terpisah. Kamus menandai kolom yang hanya tampil pada detail. Dropdown contoh berfilter mengambil opsi dari log, bukan daftar nama project statis. Snapshot hasil lab ditandai sebagai data historis, bukan dashboard live.

Sumber halaman ada di [workshop-monitoring-foundry.src.html](docs/workshop-monitoring-foundry.src.html). Setelah KQL kanonis berubah, bangun ulang dari root folder:

```powershell
node .\docs\build-foundry-workshop.mjs
```

Builder hanya memerlukan Node.js; tidak bergantung pada skill Visual Explainer. Source HTML sudah membawa CSS, JavaScript, dan aset tampilan dasar di dalamnya. Font publik diunduh pada build pertama bila cache aset belum ada; pembaca HTML final tidak memerlukannya. Builder menyisipkan KQL dari file kanonis, memeriksa dokumentasi seluruh kolom/schema agar tidak tertinggal, lalu mengemas HTML offline. Ubah sumber, bukan HTML hasil build, dan periksa tampilannya di browser jika mengubah UI. Materi tidak memanggil model atau mengubah Azure secara otomatis.

Referensi Microsoft: [Membuat Workbook](https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-create-workbook) · [Mengekspor template Workbook](https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-automate) · [Membagikan Workbook](https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-manage).

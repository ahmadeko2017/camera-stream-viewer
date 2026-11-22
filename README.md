# 📹 Konsol Pemantau IP Camera Mandiri

Antarmuka web modern, ringan, dan mandiri berbasis HTML5 semantik dan Vanilla JavaScript untuk memantau video stream IP Camera lokal tanpa ketergantungan plugin *legacy* (seperti ActiveX, Flash, atau NPAPI usang).

---

## 🎯 Fitur Utama

1. **Pemutar Multi-Fallback Cerdas**:
   - Pemutar video HTML5 native yang siap menerima stream **HLS (`.m3u8`)** untuk pemutaran *low-latency*.
   - **Snapshot Polling Fallback**: Pembaruan gambar JPEG berkala otomatis langsung dari IP kamera saat stream HLS tidak tersedia.
   - Mekanisme pemulihan koneksi otomatis dengan *exponential backoff* saat jaringan mengalami gangguan.

2. **Integrasi RTSP 1-Klik**:
   - Tampilan URL RTSP untuk **Main Stream (1080p)** dan **Sub Stream (360p)**.
   - Tombol *Quick-Copy* instan untuk langsung ditempelkan ke aplikasi pemutar eksternal (VLC Media Player, OBS Studio, NVR).
   - Penyamaran kata sandi bawaan (*masked by default* `******`) dengan opsi *toggle unmask* eksplisit.

3. **Diagnostik & Metrik Real-Time**:
   - Uji latensi jaringan (RTT probe) dengan *strict timeout* 2.5 detik.
   - Pelacak laju frame per detik (*FPS / Snapshot Rate*) dan durasi pemutaran (*Uptime*).
   - Indikator status visual: `ONLINE` (Hijau), `DEGRADED` (Kuning), `OFFLINE` (Merah).
   - Konsol log kejadian tersanitasi bebas dari eksposur kredensial mentah.

4. **Kepatuhan Desain Berstandar Antislop & WCAG AA**:
   - Palet warna industrial *dark theme* (Slate/Zinc) tanpa gradien ungu/biru generik atau efek *glassmorphism* berlebihan.
   - Rasio kontras teks tinggi (> 4.5:1) yang memenuhi standar aksesibilitas WCAG AA.
   - Dukungan navigasi keyboard penuh (`Space` untuk Jeda/Mulai, `F` untuk Fullscreen, `M` untuk alih stream).

5. **Penyimpanan Lokal (Zero Telemetry)**:
   - Pengaturan kamera disimpan murni di `LocalStorage` peramban pengguna.
   - Nol pelacak pihak ketiga (*no third-party analytics/telemetry*).

---

## 🏗️ Arsitektur Teknis

```
                        +---------------------------------------+
                        |   IP Camera (e.g. 192.168.18.122)     |
                        +-------------------+-------------------+
                                            |
                  +-------------------------+-------------------------+
                  |                                                   |
        Port 80 (HTTP)                                      Port 554 (RTSP)
                  |                                                   |
                  v                                                   v
      +-----------------------+                           +-----------------------+
      |  HTTP JPEG Snapshot   |                           |  H.264 Video Stream   |
      |  (/snapshot.jpg)      |                           |  (/ch0_0.h264)        |
      +-----------+-----------+                           +-----------+-----------+
                  |                                                   |
                  v                                                   v
+-----------------------------------+             +-----------------------------------+
|     Peramban Web (Browser)        |             |  Pemutar Eksternal (VLC / OBS)    |
| - Polling Snapshot JPEG           |             | - Putar langsung RTSP TCP/UDP     |
| - Deteksi Frame Rate & Latensi    |             | - Transcoding HLS (MediaMTX dll)  |
| - Render OSD & Kontrol Interaktif |             +-----------------------------------+
+-----------------------------------+
```

### Mengapa Peramban Web Membutuhkan Snapshot atau HLS?
Protokol transmisi RTSP (*Real Time Streaming Protocol*) menggunakan transport TCP/UDP biner mentah pada port 554 yang tidak didukung secara bawaan oleh spesifikasi sandbox keamanan HTML5 peramban web modern tanpa transcoder atau gateway (seperti WebRTC, WebAssembly demuxer, atau HLS). 

Konsol ini menyelesaikan batasan tersebut dengan menyediakan pemantauan *Snapshot Polling* berkala secara mandiri langsung di browser, sekaligus memfasilitasi URL RTSP siap pakai untuk pemutar native seperti VLC atau OBS.

---

## 🚀 Panduan Menjalankan Aplikasi

Aplikasi ini dibuat murni menggunakan teknologi web standar (HTML5, CSS3, Vanilla JS ES Modules) sehingga tidak memerlukan kompilasi (*zero build step*).

### Opsi 1: Menjalankan dengan Node.js (Rekomendasi)
```bash
# Menggunakan npx serve bawaan Node.js
npx serve . -l 3000

# Atau menggunakan http-server
npx http-server . -p 3000
```
Buka peramban pada alamat: `http://localhost:3000`.

### Opsi 2: Menjalankan dengan Python
```bash
# Python 3
python -m http.server 3000
```
Buka peramban pada alamat: `http://localhost:3000`.

---

## 📺 Panduan Integrasi RTSP ke VLC & OBS Studio

### Memutar di VLC Media Player
1. Salin URL RTSP dari konsol web (misal: tombol **Salin** pada Main Stream).
2. Buka **VLC Media Player**.
3. Pilih menu **Media** > **Open Network Stream...** (atau tekan `Ctrl + N`).
4. Tempelkan URL RTSP:
   ```
   rtsp://admin:admin@192.168.18.122:554/ch0_0.h264
   ```
5. Klik **Play**. Video stream berkualitas 1080p akan diputar secara instan.

### Menambahkan ke OBS Studio
1. Buka **OBS Studio**.
2. Pada panel **Sources**, klik tanda tambah (`+`) dan pilih **Media Source**.
3. Beri nama sumber (misal: `Kamera Pemantau 1080p`), lalu klik **OK**.
4. Hapus centang pada opsi **Local File**.
5. Pada kolom **Input**, tempelkan URL RTSP kamera:
   ```
   rtsp://admin:admin@192.168.18.122:554/ch0_0.h264
   ```
6. Pada kolom **Input Format**, masukkan `rtsp` (opsional jika dibutuhkan).
7. Klik **OK**. Kamera akan langsung tayang di kanvas OBS.

---

## ⚙️ Nilai Konfigurasi Bawaan

| Parameter | Nilai Default | Keterangan |
| :--- | :--- | :--- |
| **IP Target** | `192.168.18.122` | Alamat IP kamera di jaringan lokal |
| **Port HTTP** | `80` | Port antarmuka web dan snapshot kamera |
| **Port RTSP** | `554` | Port transmisi video RTSP kamera |
| **Username** | `admin` | Pengguna otentikasi kamera |
| **Password** | `admin` | Sandi otentikasi kamera (tersamar di UI) |
| **Main Stream** | `/ch0_0.h264` | Saluran resolusi tinggi (1080p) |
| **Sub Stream** | `/ch0_1.h264` | Saluran resolusi rendah (360p) |
| **Snapshot Path** | `/snapshot.jpg` | Titik akhir tangkapan gambar HTTP JPEG |

Seluruh konfigurasi dapat disesuaikan secara dinamis pada panel **Konfigurasi Kamera Lokal** di bagian bawah halaman dan akan otomatis disimpan ke dalam browser Anda.

---

## 🧪 Eksekusi Pengujian Otomatis

Aplikasi ini dilengkapi pengujian unit otomatis (*unit tests*) menggunakan Node.js test runner bawaan:

```bash
node --test tests/*.test.js
```

---

## 🛡️ Catatan Keamanan & Privasi
- Sandi kamera tidak pernah dikirimkan ke server eksternal mana pun dan hanya disimpan di penyimpanan lokal peramban Anda.
- Log kejadian pada antarmuka konsol menerapkan algoritma *redaction* otomatis untuk mencegah kredensial terekspos di layar pemantauan umum.

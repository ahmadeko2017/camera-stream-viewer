/**
 * Kontroler Pemutar Video & Snapshot (player.js)
 *
 * Tanggung Jawab:
 * - Mengelola pemutaran video HLS dan fallback otomatis ke Snapshot JPEG
 * - Melakukan polling snapshot kamera dengan mekanisme exponential backoff
 * - Mengatur mode rasio aspek (16:9, contain, cover) dan fullscreen
 * - Pembersihan memori dan sumber daya jaringan saat pemutaran dihentikan
 *
 * Dependensi:
 * - Hls.js (opsional jika tersedia di window.Hls)
 * - js/utils.js
 * - js/diagnostics.js
 */

export class CameraPlayer {
  constructor(videoElement, snapshotElement, overlayElement, diagnostics) {
    this.video = videoElement;
    this.snapshot = snapshotElement;
    this.overlay = overlayElement;
    this.diag = diagnostics;

    this.hlsInstance = null;
    this.pollTimer = null;
    this.isPlaying = false;
    this.isSubStream = false;
    this.activeMode = 'SNAPSHOT'; // 'HLS' | 'SNAPSHOT'
    this.consecutiveErrors = 0;
    this.currentConfig = null;
  }

  /**
   * Menginisialisasi pemutar dengan konfigurasi kamera.
   *
   * @param {Object} config - Konfigurasi kamera aktif
   */
  init(config) {
    this.currentConfig = { ...config };
    this.setAspectRatio(config.aspectRatio || '16/9');
  }

  /**
   * Memulai proses pemutaran stream kamera.
   *
   * @param {Object} [newConfig] - Konfigurasi baru opsional
   */
  start(newConfig) {
    if (newConfig) this.currentConfig = { ...newConfig };
    this.stop();
    this.isPlaying = true;
    this.consecutiveErrors = 0;
    this.diag.startUptime();

    if (this.currentConfig?.hlsPath && window.Hls && window.Hls.isSupported()) {
      this.startHlsStream();
      return;
    }

    this.startSnapshotPolling();
  }

  /**
   * Menghentikan seluruh proses pemutaran dan membersihkan timer.
   */
  stop() {
    this.isPlaying = false;
    this.diag.stopUptime();

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }

    if (this.video) {
      this.video.pause();
      this.video.removeAttribute('src');
      this.video.load();
    }
  }

  /**
   * Mengatur mode rasio aspek tampilan video/snapshot.
   *
   * @param {'16/9'|'contain'|'cover'} ratio - Nilai rasio
   */
  setAspectRatio(ratio) {
    const valid = ['16/9', 'contain', 'cover'].includes(ratio) ? ratio : '16/9';
    if (!this.video || !this.snapshot) return;

    this.video.style.objectFit = valid === '16/9' ? 'contain' : valid;
    this.snapshot.style.objectFit = valid === '16/9' ? 'contain' : valid;
  }

  /**
   * Beralih antara Main Stream (1080p) dan Sub Stream (360p).
   *
   * @param {boolean} isSub - True untuk beralih ke Sub Stream
   */
  switchStream(isSub) {
    if (this.isSubStream === isSub) return;
    this.isSubStream = isSub;
    this.diag.logEvent(`Beralih ke ${isSub ? 'Sub Stream (360p)' : 'Main Stream (1080p)'}`);
    if (this.isPlaying) this.start();
  }

  /**
   * Beralih secara eksplisit ke mode pemutaran tertentu.
   *
   * @param {'HLS'|'SNAPSHOT'} mode - Mode pemutaran
   */
  setMode(mode) {
    if (this.activeMode === mode) return;
    this.activeMode = mode;
    this.diag.logEvent(`Mode pemutar diubah ke ${mode}`);
    if (this.isPlaying) this.start();
  }

  /**
   * Memulai pemutaran stream HLS dengan Hls.js.
   */
  startHlsStream() {
    this.activeMode = 'HLS';
    this.showVideoElement();
    const hlsUrl = this.currentConfig.hlsPath;

    try {
      this.hlsInstance = new window.Hls({ enableWorker: true, lowLatencyMode: true });
      this.hlsInstance.loadSource(hlsUrl);
      this.hlsInstance.attachMedia(this.video);
      this.setupHlsListeners();
      this.video.play().catch(() => {});
    } catch {
      this.handleStreamFailure('Gagal menginisialisasi modul HLS');
    }
  }

  /**
   * Pasang pendengar kejadian untuk instans Hls.js.
   */
  setupHlsListeners() {
    if (!this.hlsInstance) return;

    this.hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
      this.hideOverlay();
      this.diag.logEvent('Stream HLS berhasil dimuat', 'success');
    });

    this.hlsInstance.on(window.Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        this.handleStreamFailure(`Kesalahan fatal HLS: ${data.type}`);
      }
    });
  }

  /**
   * Memulai perulangan polling snapshot JPEG dari kamera.
   */
  startSnapshotPolling() {
    this.activeMode = 'SNAPSHOT';
    this.showSnapshotElement();
    this.fetchNextSnapshot();
  }

  /**
   * Mengambil gambar snapshot berikutnya dari kamera dengan timestamp acak.
   */
  fetchNextSnapshot() {
    if (!this.isPlaying) return;

    const imgUrl = this.buildSnapshotUrl();
    const probeImg = new Image();

    const onFinish = (isSuccess) => {
      if (!this.isPlaying) return;
      this.processSnapshotResult(isSuccess, imgUrl);
    };

    probeImg.onload = () => onFinish(true);
    probeImg.onerror = () => onFinish(false);
    probeImg.src = imgUrl;
  }

  /**
   * Memproses hasil pengambilan snapshot dan mengatur jadwal putaran berikutnya.
   *
   * @param {boolean} isSuccess - Status pengambilan gambar
   * @param {string} validUrl - URL gambar yang valid
   */
  processSnapshotResult(isSuccess, validUrl) {
    if (isSuccess) {
      this.consecutiveErrors = 0;
      this.snapshot.src = validUrl;
      this.hideOverlay();
      this.diag.tickFrame();
    } else {
      this.consecutiveErrors += 1;
      this.handlePollingError();
    }

    const nextDelay = this.calculateNextPollDelay();
    this.pollTimer = setTimeout(() => this.fetchNextSnapshot(), nextDelay);
  }

  /**
   * Menghitung jeda waktu polling dengan exponential backoff jika terjadi galat.
   *
   * @returns {number} Jeda waktu milidetik
   */
  calculateNextPollDelay() {
    const baseInterval = Number(this.currentConfig?.pollIntervalMs) || 1000;
    if (this.consecutiveErrors === 0) return baseInterval;
    const backoffFactor = Math.min(this.consecutiveErrors, 5);
    return baseInterval * Math.pow(1.5, backoffFactor);
  }

  /**
   * Menangani kesalahan koneksi snapshot yang berulang.
   */
  handlePollingError() {
    if (this.consecutiveErrors >= 3) {
      this.showOverlay('Koneksi Snapshot Kamera Terputus', true);
      this.diag.logEvent('Kamera offline atau snapshot tidak merespons', 'error');
    }
  }

  /**
   * Membangun URL HTTP lengkap untuk gambar snapshot kamera.
   *
   * @returns {string} URL snapshot
   */
  buildSnapshotUrl() {
    const cfg = this.currentConfig;
    const path = cfg.snapshotPath.startsWith('/') ? cfg.snapshotPath : `/${cfg.snapshotPath}`;
    const sep = path.includes('?') ? '&' : '?';
    return `http://${cfg.ip}:${cfg.httpPort}${path}${sep}_t=${Date.now()}`;
  }

  /**
   * Mengatasi kegagalan pemutaran stream dan memicu fallback otomatis.
   *
   * @param {string} reason - Penyebab kegagalan
   */
  handleStreamFailure(reason) {
    this.diag.logEvent(`${reason}. Beralih ke Snapshot Player`, 'warning');
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
    this.startSnapshotPolling();
  }

  /**
   * Menampilkan elemen video dan menyembunyikan snapshot.
   */
  showVideoElement() {
    this.video.classList.remove('hidden');
    this.snapshot.classList.add('hidden');
  }

  /**
   * Menampilkan elemen snapshot dan menyembunyikan video.
   */
  showSnapshotElement() {
    this.snapshot.classList.remove('hidden');
    this.video.classList.add('hidden');
  }

  /**
   * Menampilkan overlay status di atas pemutar.
   *
   * @param {string} message - Pesan overlay
   * @param {boolean} [isError=false] - Status kesalahan
   */
  showOverlay(message, isError = false) {
    if (!this.overlay) return;
    this.overlay.classList.remove('hidden');
    const textNode = this.overlay.querySelector('.overlay-text');
    if (textNode) textNode.textContent = message;
    this.overlay.classList.toggle('overlay-error', isError);
  }

  /**
   * Menyembunyikan overlay status pemutar.
   */
  hideOverlay() {
    if (this.overlay) this.overlay.classList.add('hidden');
  }

  /**
   * Beralih ke mode layar penuh (fullscreen) atau keluar darinya.
   *
   * @param {HTMLElement} containerElement - Wadah kontainer yang di-fullscreen
   */
  async toggleFullscreen(containerElement) {
    if (!document.fullscreenElement) {
      try {
        await containerElement.requestFullscreen();
      } catch {
        // Abaikan penolakan izin fullscreen oleh browser
      }
    } else {
      await document.exitFullscreen();
    }
  }
}

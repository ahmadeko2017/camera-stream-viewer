/**
 * Orkestrator Aplikasi Pemantau Kamera (app.js)
 *
 * Tanggung Jawab:
 * - Menghubungkan antarmuka DOM dengan modul Player, Diagnostics, dan Utils
 * - Sinkronisasi pengaturan kamera dengan LocalStorage
 * - Manajemen alur diagnostik berkala (latency, fps, status koneksi)
 * - Penanganan navigasi pintasan papan ketik (keyboard shortcuts)
 *
 * Dependensi:
 * - js/utils.js
 * - js/diagnostics.js
 * - js/player.js
 */

import {
  loadConfig,
  saveConfig,
  resetConfig,
  buildRtspUrl,
  maskPassword,
  showToast,
  copyToClipboard,
  formatUptime,
  formatTimestamp
} from './utils.js';
import { DiagnosticsManager } from './diagnostics.js';
import { CameraPlayer } from './player.js';

class AppController {
  constructor() {
    this.config = loadConfig();
    this.diag = new DiagnosticsManager();
    this.player = null;
    this.isMaskedRtsp = true;
    this.diagInterval = null;
    this.clockInterval = null;
  }

  /**
   * Inisialisasi awal seluruh komponen aplikasi saat DOM siap.
   */
  bootstrap() {
    const video = document.getElementById('videoPlayer');
    const snapshot = document.getElementById('snapshotPlayer');
    const overlay = document.getElementById('playerOverlay');

    this.player = new CameraPlayer(video, snapshot, overlay, this.diag);
    this.player.init(this.config);

    this.bindDomEvents();
    this.populateFormFields();
    this.renderRtspUrls();
    this.startPeriodicTasks();
    this.player.start();
    this.diag.logEvent('Aplikasi pemantau kamera berhasil diinisialisasi');
  }

  /**
   * Mengikat seluruh pendengar kejadian elemen DOM.
   */
  bindDomEvents() {
    this.bindPlayerControls();
    this.bindRtspActions();
    this.bindSettingsForm();
    this.bindKeyboardShortcuts();
  }

  /**
   * Mengikat kontrol pemutar: play/pause, stream toggle, mode, rasio, fullscreen.
   */
  bindPlayerControls() {
    const playBtn = document.getElementById('playPauseBtn');
    playBtn?.addEventListener('click', () => this.togglePlayback());

    const mainStreamBtn = document.getElementById('streamMainBtn');
    mainStreamBtn?.addEventListener('click', () => this.selectStream(false));

    const subStreamBtn = document.getElementById('streamSubBtn');
    subStreamBtn?.addEventListener('click', () => this.selectStream(true));

    const ratioSelect = document.getElementById('aspectRatioSelect');
    ratioSelect?.addEventListener('change', (e) => this.changeAspectRatio(e.target.value));

    const fullscreenBtn = document.getElementById('fullscreenBtn');
    fullscreenBtn?.addEventListener('click', () => {
      const container = document.getElementById('playerContainer');
      if (container) this.player.toggleFullscreen(container);
    });
  }

  /**
   * Mengikat aksi penyalinan dan penyamaran sandi pada kartu RTSP.
   */
  bindRtspActions() {
    const copyMainBtn = document.getElementById('copyMainRtspBtn');
    copyMainBtn?.addEventListener('click', () => {
      const url = buildRtspUrl(this.config, false, false);
      copyToClipboard(url, 'RTSP Main Stream disalin ke papan klip');
    });

    const copySubBtn = document.getElementById('copySubRtspBtn');
    copySubBtn?.addEventListener('click', () => {
      const url = buildRtspUrl(this.config, true, false);
      copyToClipboard(url, 'RTSP Sub Stream disalin ke papan klip');
    });

    const toggleMaskBtn = document.getElementById('toggleMaskBtn');
    toggleMaskBtn?.addEventListener('click', () => {
      this.isMaskedRtsp = !this.isMaskedRtsp;
      this.renderRtspUrls();
    });
  }

  /**
   * Mengikat formulir pengaturan dan tombol simpan/reset.
   */
  bindSettingsForm() {
    const form = document.getElementById('settingsForm');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveSettings();
    });

    const resetBtn = document.getElementById('resetSettingsBtn');
    resetBtn?.addEventListener('click', () => this.handleResetSettings());

    const togglePassBtn = document.getElementById('toggleFormPassBtn');
    togglePassBtn?.addEventListener('click', () => this.togglePasswordVisibility());
  }

  /**
   * Menangani penyimpanan pengaturan baru dari form.
   */
  handleSaveSettings() {
    const updated = this.readFormFields();
    if (!saveConfig(updated)) {
      showToast('Gagal menyimpan konfigurasi ke penyimpanan lokal', 'error');
      return;
    }

    this.config = updated;
    this.player.init(this.config);
    this.player.start();
    this.renderRtspUrls();
    this.updateTargetBadge();
    showToast('Konfigurasi kamera berhasil diperbarui', 'success');
    this.diag.logEvent('Konfigurasi kamera diperbarui');
  }

  /**
   * Mengatur ulang konfigurasi ke setelan awal.
   */
  handleResetSettings() {
    this.config = resetConfig();
    this.populateFormFields();
    this.player.init(this.config);
    this.player.start();
    this.renderRtspUrls();
    this.updateTargetBadge();
    showToast('Konfigurasi dikembalikan ke nilai default', 'info');
    this.diag.logEvent('Konfigurasi kamera dikembalikan ke default');
  }

  /**
   * Membaca nilai dari elemen formulir ke objek konfigurasi.
   *
   * @returns {Object} Konfigurasi terbaca
   */
  readFormFields() {
    const getVal = (id) => document.getElementById(id)?.value?.trim() || '';
    return {
      ...this.config,
      ip: getVal('cfgIp') || '192.168.18.122',
      httpPort: Number(getVal('cfgHttpPort')) || 80,
      rtspPort: Number(getVal('cfgRtspPort')) || 554,
      username: getVal('cfgUser') || 'admin',
      password: getVal('cfgPass') || 'admin',
      mainChannel: getVal('cfgMainCh') || '/ch0_0.h264',
      subChannel: getVal('cfgSubCh') || '/ch0_1.h264',
      snapshotPath: getVal('cfgSnapshot') || '/snapshot.jpg',
      hlsPath: getVal('cfgHls') || '',
      pollIntervalMs: Number(getVal('cfgPollInterval')) || 1000
    };
  }

  /**
   * Mengisi elemen formulir dengan data konfigurasi aktif.
   */
  populateFormFields() {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val ?? '';
    };

    setVal('cfgIp', this.config.ip);
    setVal('cfgHttpPort', this.config.httpPort);
    setVal('cfgRtspPort', this.config.rtspPort);
    setVal('cfgUser', this.config.username);
    setVal('cfgPass', this.config.password);
    setVal('cfgMainCh', this.config.mainChannel);
    setVal('cfgSubCh', this.config.subChannel);
    setVal('cfgSnapshot', this.config.snapshotPath);
    setVal('cfgHls', this.config.hlsPath);
    setVal('cfgPollInterval', this.config.pollIntervalMs);

    this.updateTargetBadge();
  }

  /**
   * Memperbarui label alamat IP target pada header.
   */
  updateTargetBadge() {
    const badge = document.getElementById('targetIpBadge');
    if (badge) badge.textContent = `IP: ${this.config.ip}:${this.config.httpPort}`;
  }

  /**
   * Merender teks URL RTSP pada panel antarmuka dengan opsi masking.
   */
  renderRtspUrls() {
    const mainBox = document.getElementById('mainRtspDisplay');
    const subBox = document.getElementById('subRtspDisplay');
    const toggleBtn = document.getElementById('toggleMaskBtn');

    if (mainBox) mainBox.textContent = buildRtspUrl(this.config, false, this.isMaskedRtsp);
    if (subBox) subBox.textContent = buildRtspUrl(this.config, true, this.isMaskedRtsp);
    if (toggleBtn) {
      toggleBtn.textContent = this.isMaskedRtsp ? 'Tampilkan Sandi' : 'Samarkan Sandi';
    }
  }

  /**
   * Toggle alih putar/jeda streaming.
   */
  togglePlayback() {
    const btn = document.getElementById('playPauseBtn');
    if (this.player.isPlaying) {
      this.player.stop();
      if (btn) btn.textContent = 'Mulai Pantau';
      this.player.showOverlay('Pemantauan Dijeda');
    } else {
      this.player.start();
      if (btn) btn.textContent = 'Jeda Pantau';
    }
  }

  /**
   * Memilih saluran stream kamera (Main 1080p vs Sub 360p).
   *
   * @param {boolean} isSub - True untuk sub stream
   */
  selectStream(isSub) {
    this.player.switchStream(isSub);
    const mainBtn = document.getElementById('streamMainBtn');
    const subBtn = document.getElementById('streamSubBtn');
    const osdStream = document.getElementById('osdStreamMode');

    mainBtn?.classList.toggle('btn-active', !isSub);
    subBtn?.classList.toggle('btn-active', isSub);
    if (osdStream) osdStream.textContent = isSub ? 'SUB (360p)' : 'MAIN (1080p)';
  }

  /**
   * Mengubah rasio aspek tampilan video/snapshot.
   *
   * @param {string} ratio - Nilai rasio terpilih
   */
  changeAspectRatio(ratio) {
    this.config.aspectRatio = ratio;
    this.player.setAspectRatio(ratio);
    saveConfig(this.config);
  }

  /**
   * Membuka atau menutup visibilitas input password pada formulir.
   */
  togglePasswordVisibility() {
    const passInput = document.getElementById('cfgPass');
    const btn = document.getElementById('toggleFormPassBtn');
    if (!passInput) return;

    const isPass = passInput.type === 'password';
    passInput.type = isPass ? 'text' : 'password';
    if (btn) btn.textContent = isPass ? 'Sembunyikan' : 'Perlihatkan';
  }

  /**
   * Memulai perulangan diagnostik dan pembaruan jam OSD.
   */
  startPeriodicTasks() {
    this.clockInterval = setInterval(() => this.updateClockAndStats(), 1000);
    this.runLatencyProbe();
    this.diagInterval = setInterval(() => this.runLatencyProbe(), 7000);
  }

  /**
   * Memperbarui timestamp jam, uptime, dan pembacaan FPS pada UI.
   */
  updateClockAndStats() {
    const clockEl = document.getElementById('osdClock');
    if (clockEl) clockEl.textContent = formatTimestamp();

    const uptimeEl = document.getElementById('statUptime');
    if (uptimeEl) uptimeEl.textContent = formatUptime(this.diag.getUptimeSeconds());

    const fpsEl = document.getElementById('statFps');
    if (fpsEl) fpsEl.textContent = `${this.diag.fps} FPS`;

    this.renderLogConsole();
  }

  /**
   * Menjalankan uji probe latensi ke IP kamera.
   */
  async runLatencyProbe() {
    const { rtt } = await this.diag.probeLatency(this.config.ip, this.config.httpPort);
    const rttEl = document.getElementById('statLatency');
    const statusPill = document.getElementById('connectionStatusPill');

    if (rttEl) rttEl.textContent = rtt !== null ? `${rtt} ms` : 'N/A';
    if (!statusPill) return;

    statusPill.className = `status-pill status-${this.diag.status.toLowerCase()}`;
    statusPill.textContent = this.diag.status;
  }

  /**
   * Merender riwayat log kejadian ke dalam konsol UI.
   */
  renderLogConsole() {
    const consoleEl = document.getElementById('logHistoryList');
    if (!consoleEl) return;

    const logs = this.diag.getLogs().slice(0, 8);
    consoleEl.innerHTML = logs
      .map((l) => `<li class="log-item log-${l.level}"><span class="log-time">[${l.timestamp}]</span> ${l.message}</li>`)
      .join('');
  }

  /**
   * Menangani navigasi keyboard shortcuts untuk aksesibilitas.
   */
  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlayback();
      } else if (e.key === 'f' || e.key === 'F') {
        const container = document.getElementById('playerContainer');
        if (container) this.player.toggleFullscreen(container);
      } else if (e.key === 'm' || e.key === 'M') {
        this.selectStream(!this.player.isSubStream);
      }
    });
  }
}

// Inisialisasi saat struktur dokumen HTML siap
document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.bootstrap();
});

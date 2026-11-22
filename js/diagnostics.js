/**
 * Modul Diagnostik (diagnostics.js) — Pemantau latensi jaringan, uptime, dan log kejadian.
 *
 * Tanggung Jawab:
 * - Menguji latensi jaringan (RTT probe) dengan batasan waktu ketat (strict timeout 2.5s)
 * - Melacak durasi pemutaran aktif (uptime) secara akurat
 * - Menghitung laju frame rendering / snapshot per detik (FPS/SPS)
 * - Mengelola riwayat kejadian sistem dengan sanitasi kredensial
 *
 * Dependensi:
 * - Fetch API / DOM Image probe
 * - js/utils.js (formatTimestamp)
 */

import { formatTimestamp } from './utils.js';

const STRICT_TIMEOUT_MS = 2500;
const MAX_LOG_HISTORY = 40;

export class DiagnosticsManager {
  constructor() {
    this.logs = [];
    this.startTime = null;
    this.frameCount = 0;
    this.fps = 0;
    this.lastFpsUpdate = performance.now();
    this.rtt = null;
    this.status = 'OFFLINE'; // 'ONLINE' | 'DEGRADED' | 'OFFLINE'
  }

  /**
   * Memulai pencatatan uptime pemantauan.
   */
  startUptime() {
    this.startTime = Date.now();
  }

  /**
   * Menghentikan pencatatan uptime pemantauan.
   */
  stopUptime() {
    this.startTime = null;
  }

  /**
   * Menghitung total durasi uptime dalam detik.
   *
   * @returns {number} Durasi detik
   */
  getUptimeSeconds() {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Menghitung dan memperbarui laju frame per detik (FPS).
   *
   * @returns {number} Nilai FPS terkini
   */
  tickFrame() {
    this.frameCount += 1;
    const now = performance.now();
    const elapsed = now - this.lastFpsUpdate;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    return this.fps;
  }

  /**
   * Melakukan uji latensi HTTP ke target kamera dengan strict timeout 2.5 detik.
   *
   * @param {string} targetHost - Alamat IP atau hostname kamera
   * @param {number} port - Port HTTP kamera
   * @returns {Promise<{rtt: number|null, reachable: boolean}>}
   */
  async probeLatency(targetHost, port = 80) {
    const probeUrl = `http://${targetHost}:${port}/favicon.ico?_=${Date.now()}`;
    const start = performance.now();

    const result = await this.executeProbe(probeUrl);
    const duration = Math.round(performance.now() - start);

    if (result) {
      this.rtt = duration;
      this.status = duration > 1000 ? 'DEGRADED' : 'ONLINE';
      return { rtt: duration, reachable: true };
    }

    this.rtt = null;
    this.status = 'OFFLINE';
    return { rtt: null, reachable: false };
  }

  /**
   * Eksekusi probe gambar dengan timeout abort controller.
   *
   * @param {string} url - Target URL uji
   * @returns {Promise<boolean>} Status respons
   */
  async executeProbe(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STRICT_TIMEOUT_MS);

    try {
      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timer);
      return true;
    } catch {
      clearTimeout(timer);
      return false;
    }
  }

  /**
   * Mencatat kejadian sistem baru ke dalam log dengan sanitasi teks.
   *
   * @param {string} message - Pesan kejadian
   * @param {'info'|'warning'|'error'|'success'} [level='info'] - Tingkat keparahan
   */
  logEvent(message, level = 'info') {
    const cleanMessage = String(message).replace(/:\/\/([^:]+):([^@]+)@/, '://$1:******@');
    const entry = {
      timestamp: formatTimestamp(),
      level,
      message: cleanMessage
    };

    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOG_HISTORY) {
      this.logs.pop();
    }
  }

  /**
   * Mengambil seluruh salinan log kejadian saat ini.
   *
   * @returns {Array<{timestamp: string, level: string, message: string}>}
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Membersihkan seluruh riwayat log kejadian.
   */
  clearLogs() {
    this.logs = [];
  }
}

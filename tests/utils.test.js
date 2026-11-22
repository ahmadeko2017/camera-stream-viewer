/**
 * Pengujian Unit Utilitas (utils.test.js)
 *
 * Menguji fungsionalitas masking kredensial, sanitasi HTML,
 * formatting waktu uptime, dan persistensi konfigurasi.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  maskPassword,
  buildRtspUrl,
  sanitizeHtml,
  formatUptime,
  formatTimestamp,
  loadConfig,
  saveConfig,
  resetConfig,
  DEFAULT_CONFIG
} from '../js/utils.js';

describe('Modul Utils - Unit Testing', () => {
  describe('maskPassword', () => {
    test('harus menyamarkan kata sandi saat isMasked bernilai true', () => {
      const result = maskPassword('rahasia123', true);
      assert.equal(result, '******');
    });

    test('harus menampilkan kata sandi asli saat isMasked bernilai false', () => {
      const result = maskPassword('rahasia123', false);
      assert.equal(result, 'rahasia123');
    });

    test('harus mengembalikan string kosong jika sandi null atau undefined', () => {
      assert.equal(maskPassword('', true), '');
      assert.equal(maskPassword(null, true), '');
    });
  });

  describe('buildRtspUrl', () => {
    test('harus membuat URL RTSP Main Stream dengan sandi tersamar secara default', () => {
      const url = buildRtspUrl(DEFAULT_CONFIG, false, true);
      assert.equal(url, 'rtsp://admin:******@192.168.18.122:554/ch0_0.h264');
    });

    test('harus membuat URL RTSP Sub Stream dengan sandi terbuka saat diminta', () => {
      const url = buildRtspUrl(DEFAULT_CONFIG, true, false);
      assert.equal(url, 'rtsp://admin:admin@192.168.18.122:554/ch0_1.h264');
    });

    test('harus menangani kustomisasi IP dan saluran secara tepat', () => {
      const customConfig = {
        ...DEFAULT_CONFIG,
        ip: '10.0.0.50',
        rtspPort: 8554,
        mainChannel: 'live.sdp'
      };
      const url = buildRtspUrl(customConfig, false, false);
      assert.equal(url, 'rtsp://admin:admin@10.0.0.50:8554/live.sdp');
    });
  });

  describe('sanitizeHtml', () => {
    test('harus meng-escape karakter berbahaya XSS', () => {
      const input = '<script>alert("xss")</script>&\'';
      const safe = sanitizeHtml(input);
      assert.equal(safe, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;&#039;');
    });

    test('harus mengembalikan string kosong untuk input non-string', () => {
      assert.equal(sanitizeHtml(null), '');
      assert.equal(sanitizeHtml(12345), '');
    });
  });

  describe('formatUptime', () => {
    test('harus memformat detik menjadi HH:MM:SS secara presisi', () => {
      assert.equal(formatUptime(0), '00:00:00');
      assert.equal(formatUptime(59), '00:00:59');
      assert.equal(formatUptime(65), '00:01:05');
      assert.equal(formatUptime(3665), '01:01:05');
    });
  });

  describe('formatTimestamp', () => {
    test('harus memformat objek tanggal ke YYYY-MM-DD HH:mm:ss', () => {
      const fixedDate = new Date(2026, 10, 22, 15, 30, 45); // Nov 22, 2026
      const formatted = formatTimestamp(fixedDate);
      assert.equal(formatted, '2026-11-22 15:30:45');
    });
  });

  describe('Persistensi LocalStorage (loadConfig, saveConfig, resetConfig)', () => {
    beforeEach(() => {
      // Mocking global localStorage untuk lingkungan Node.js
      const store = new Map();
      globalThis.localStorage = {
        getItem: (k) => store.get(k) || null,
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear()
      };
    });

    test('harus memuat DEFAULT_CONFIG jika storage kosong', () => {
      const cfg = loadConfig();
      assert.equal(cfg.ip, '192.168.18.122');
      assert.equal(cfg.httpPort, 80);
      assert.equal(cfg.rtspPort, 554);
    });

    test('harus berhasil menyimpan dan memuat ulang konfigurasi kustom', () => {
      const custom = { ...DEFAULT_CONFIG, ip: '192.168.1.99', httpPort: 8080 };
      const saved = saveConfig(custom);
      assert.equal(saved, true);

      const loaded = loadConfig();
      assert.equal(loaded.ip, '192.168.1.99');
      assert.equal(loaded.httpPort, 8080);
    });

    test('harus mengembalikan default saat resetConfig dipanggil', () => {
      saveConfig({ ...DEFAULT_CONFIG, ip: '10.10.10.10' });
      const reset = resetConfig();
      assert.equal(reset.ip, '192.168.18.122');
      assert.equal(loadConfig().ip, '192.168.18.122');
    });
  });
});

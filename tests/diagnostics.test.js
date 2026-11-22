/**
 * Pengujian Unit Modul Diagnostik (diagnostics.test.js)
 *
 * Menguji pelacak uptime, kalkulator frame rate, dan sanitasi log kejadian.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticsManager } from '../js/diagnostics.js';

describe('Modul DiagnosticsManager - Unit Testing', () => {
  let diag;

  beforeEach(() => {
    diag = new DiagnosticsManager();
  });

  test('harus menginisialisasi dengan status awal OFFLINE dan log kosong', () => {
    assert.equal(diag.status, 'OFFLINE');
    assert.equal(diag.getLogs().length, 0);
    assert.equal(diag.getUptimeSeconds(), 0);
  });

  test('harus melacak uptime dengan akurat setelah startUptime', (t, done) => {
    diag.startUptime();
    setTimeout(() => {
      const uptime = diag.getUptimeSeconds();
      assert.ok(uptime >= 0);
      diag.stopUptime();
      assert.equal(diag.getUptimeSeconds(), 0);
      done();
    }, 100);
  });

  test('harus menyamarkan kata sandi dalam log kejadian secara otomatis', () => {
    const rawMsg = 'Koneksi ke rtsp://admin:mypassword123@192.168.18.122:554/ch0_0.h264 berhasil';
    diag.logEvent(rawMsg, 'info');

    const logs = diag.getLogs();
    assert.equal(logs.length, 1);
    assert.ok(!logs[0].message.includes('mypassword123'));
    assert.ok(logs[0].message.includes('admin:******@'));
  });

  test('harus membatasi jumlah log maksimum agar tidak membebani memori', () => {
    for (let i = 0; i < 60; i++) {
      diag.logEvent(`Kejadian uji ke-${i}`);
    }
    const logs = diag.getLogs();
    assert.ok(logs.length <= 40);
  });

  test('harus mengosongkan log saat clearLogs dipanggil', () => {
    diag.logEvent('Event 1');
    diag.logEvent('Event 2');
    diag.clearLogs();
    assert.equal(diag.getLogs().length, 0);
  });
});

/**
 * Pengujian Unit Modul Player (player.test.js)
 *
 * Menguji inisialisasi status pemutar, konstruksi URL snapshot,
 * perhitungan backoff delay, dan alih stream.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CameraPlayer } from '../js/player.js';
import { DiagnosticsManager } from '../js/diagnostics.js';
import { DEFAULT_CONFIG } from '../js/utils.js';

describe('Modul CameraPlayer - Unit Testing', () => {
  let player;
  let diag;
  let mockVideo;
  let mockSnapshot;
  let mockOverlay;

  beforeEach(() => {
    diag = new DiagnosticsManager();
    mockVideo = {
      classList: { add: () => {}, remove: () => {} },
      style: {},
      pause: () => {},
      removeAttribute: () => {},
      load: () => {}
    };
    mockSnapshot = {
      classList: { add: () => {}, remove: () => {} },
      style: {},
      src: ''
    };
    mockOverlay = {
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      querySelector: () => ({ textContent: '' })
    };

    player = new CameraPlayer(mockVideo, mockSnapshot, mockOverlay, diag);
    player.init(DEFAULT_CONFIG);
  });

  test('harus menginisialisasi konfigurasi dengan benar', () => {
    assert.equal(player.currentConfig.ip, '192.168.18.122');
    assert.equal(player.currentConfig.httpPort, 80);
    assert.equal(player.activeMode, 'SNAPSHOT');
    assert.equal(player.isPlaying, false);
  });

  test('harus membangun URL snapshot HTTP dengan parameter timestamp', () => {
    const url = player.buildSnapshotUrl();
    assert.ok(url.startsWith('http://192.168.18.122:80/snapshot.jpg?_t='));
  });

  test('harus menghitung jeda backoff exponential secara bertingkat pada galat', () => {
    player.consecutiveErrors = 0;
    assert.equal(player.calculateNextPollDelay(), 1000);

    player.consecutiveErrors = 1;
    assert.equal(player.calculateNextPollDelay(), 1500);

    player.consecutiveErrors = 2;
    assert.equal(player.calculateNextPollDelay(), 2250);
  });

  test('harus mengubah stream antara Main dan Sub saat switchStream dipanggil', () => {
    assert.equal(player.isSubStream, false);
    player.switchStream(true);
    assert.equal(player.isSubStream, true);
    player.switchStream(false);
    assert.equal(player.isSubStream, false);
  });

  test('harus membersihkan timer dan status saat stop dipanggil', () => {
    player.isPlaying = true;
    player.stop();
    assert.equal(player.isPlaying, false);
    assert.equal(player.pollTimer, null);
  });
});

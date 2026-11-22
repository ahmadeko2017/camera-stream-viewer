/**
 * Utilitas Umum (utils.js) — Fungsi pembantu sanitasi, kredensial, dan persistensi.
 *
 * Tanggung Jawab:
 * - Menyamarkan (masking) kredensial sensitif untuk tampilan UI dan log
 * - Sanitasi output HTML guna mencegah Cross-Site Scripting (XSS)
 * - Penyimpanan dan pemulihan konfigurasi kamera via LocalStorage
 * - Manajemen notifikasi toast dan penyalinan clipboard
 *
 * Dependensi:
 * - Web Storage API (localStorage)
 * - Clipboard API (navigator.clipboard)
 */

export const DEFAULT_CONFIG = Object.freeze({
  ip: '192.168.18.122',
  httpPort: 80,
  rtspPort: 554,
  username: 'admin',
  password: 'admin',
  mainChannel: '/ch0_0.h264',
  subChannel: '/ch0_1.h264',
  snapshotPath: '/snapshot.jpg',
  hlsPath: '',
  pollIntervalMs: 1000,
  aspectRatio: '16/9'
});

const STORAGE_KEY = 'camera_viewer_config_v1';

/**
 * Menyamarkan string sandi sensitif dengan karakter bintang.
 *
 * @param {string} password - Sandi yang akan disamarkan
 * @param {boolean} isMasked - Penanda apakah sandi harus disamarkan
 * @returns {string} String sandi tersamar atau asli
 */
export function maskPassword(password, isMasked = true) {
  if (!password) return '';
  if (!isMasked) return password;
  return '******';
}

/**
 * Menyusun URL RTSP lengkap dengan opsi penyamaran kata sandi.
 *
 * @param {Object} config - Objek konfigurasi kamera
 * @param {boolean} isSubStream - True jika meminta sub stream
 * @param {boolean} isMasked - True jika sandi perlu disamarkan
 * @returns {string} URL RTSP yang terformat
 */
export function buildRtspUrl(config, isSubStream = false, isMasked = true) {
  const channel = isSubStream ? config.subChannel : config.mainChannel;
  const safeUser = encodeURIComponent(config.username || 'admin');
  const safePass = isMasked
    ? '******'
    : encodeURIComponent(config.password || '');
  const portPart = config.rtspPort ? `:${config.rtspPort}` : '';
  const cleanChannel = channel.startsWith('/') ? channel : `/${channel}`;

  return `rtsp://${safeUser}:${safePass}@${config.ip}${portPart}${cleanChannel}`;
}

/**
 * Sanitasi string masukan untuk pencegahan XSS pada DOM.
 *
 * @param {string} rawString - Teks mentah yang akan dibersihkan
 * @returns {string} Teks aman yang telah di-escape
 */
export function sanitizeHtml(rawString) {
  if (typeof rawString !== 'string') return '';
  return rawString
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Menampilkan pesan toast sementara yang ramah pembaca layar.
 *
 * @param {string} message - Pesan yang ditampilkan
 * @param {'info'|'success'|'warning'|'error'} type - Tipe notifikasi
 * @param {number} duration - Durasi tayang dalam milidetik
 */
export function showToast(message, type = 'info', duration = 2500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * Memformat durasi detik ke dalam format jam menit detik HH:MM:SS.
 *
 * @param {number} totalSeconds - Total durasi berjalan
 * @returns {string} Format teks waktu
 */
export function formatUptime(totalSeconds) {
  const validSec = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = String(Math.floor(validSec / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((validSec % 3600) / 60)).padStart(2, '0');
  const seconds = String(validSec % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Mengambil timestamp waktu lokal terformat YYYY-MM-DD HH:mm:ss.
 *
 * @param {Date} [dateObj=new Date()] - Objek tanggal
 * @returns {string} Timestamp terformat
 */
export function formatTimestamp(dateObj = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const mins = pad(dateObj.getMinutes());
  const secs = pad(dateObj.getSeconds());
  return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
}

/**
 * Memuat konfigurasi kamera dari LocalStorage atau default.
 *
 * @returns {Object} Konfigurasi aktif
 */
export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Menyimpan konfigurasi kamera ke LocalStorage secara aman.
 *
 * @param {Object} config - Konfigurasi yang akan disimpan
 * @returns {boolean} Status keberhasilan penyimpanan
 */
export function saveConfig(config) {
  if (!config || typeof config !== 'object') return false;
  try {
    const sanitized = {
      ...DEFAULT_CONFIG,
      ...config,
      httpPort: Number(config.httpPort) || 80,
      rtspPort: Number(config.rtspPort) || 554,
      pollIntervalMs: Number(config.pollIntervalMs) || 1000
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

/**
 * Mengembalikan konfigurasi ke setelan default awal.
 *
 * @returns {Object} Konfigurasi default
 */
export function resetConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Tidak ada tindakan saat LocalStorage tidak dapat diakses
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Menyalin teks ke clipboard pengguna dan menampilkan umpan balik visual.
 *
 * @param {string} text - Teks yang akan disalin
 * @param {string} successMessage - Pesan sukses untuk toast
 * @returns {Promise<boolean>} Status keberhasilan
 */
export async function copyToClipboard(text, successMessage = 'Tersalin ke papan klip') {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage, 'success');
    return true;
  } catch {
    showToast('Gagal menyalin teks ke papan klip', 'error');
    return false;
  }
}

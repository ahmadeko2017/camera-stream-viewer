/**
 * api.ts — Klien API terpusat untuk berkomunikasi dengan Gateway IP Camera
 */

const BASE_URL = "http://localhost:8088";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

export const api = {
  getStatus: () => request<{ gateway_active: boolean; camera_ip: string; rtsp_connected: boolean }>("/api/status"),
  sendPtz: (command: string) => request("/api/ptz", { method: "POST", body: JSON.stringify({ command }) }),
  sendPtzStep: (command: string, duration_ms: number = 600) =>
    request("/api/ptz/step", { method: "POST", body: JSON.stringify({ command, duration_ms }) }),
  setImage: (brightness: number, contrast: number, saturation: number) =>
    request("/api/image", { method: "POST", body: JSON.stringify({ brightness, contrast, saturation }) }),
  setOrientation: (flip?: number, power?: number) =>
    request("/api/image/orientation", { method: "POST", body: JSON.stringify({ flip, power }) }),
  setAudio: (voice: number, speaker: number) =>
    request("/api/audio", { method: "POST", body: JSON.stringify({ voice, speaker }) }),
  setNightVision: (mode: number) =>
    request("/api/nightvision", { method: "POST", body: JSON.stringify({ mode }) }),
  setPreset: (action: "add" | "call" | "delete", index: number) =>
    request("/api/preset", { method: "POST", body: JSON.stringify({ action, index }) }),
  setOsd: (show_time: boolean, custom_text: string, pos_x: number, pos_y: number) =>
    request("/api/osd", { method: "POST", body: JSON.stringify({ show_time, custom_text, pos_x, pos_y }) }),
  setAlarm: (motion_detection: number, email: number, capture: number, videorecord: number) =>
    request("/api/alarm", {
      method: "POST",
      body: JSON.stringify({ motion_detection, email, capture, videorecord }),
    }),
  syncTime: () => request("/api/system/timesync", { method: "POST" }),
  reboot: () => request("/api/system/reboot", { method: "POST" }),
  getInfo: () => request<{ device: string; flow: string }>("/api/system/info"),
  sendTalkAudio: async (audioData: ArrayBuffer | Blob): Promise<{ status: string; bytes_sent?: number; detail?: string }> => {
    const response = await fetch(`${BASE_URL}/api/talk`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: audioData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return response.json();
  },
  getStorageStatus: () =>
    request<{
      camera_sd: {
        sd_detected: boolean;
        sd_status_code: string;
        format_status_code: string;
        total_capacity: string;
        available_capacity: string;
        status_label: string;
      };
      local_disk: {
        total_gb: number;
        used_gb: number;
        free_gb: number;
        free_percent: number;
      };
      recorder: {
        is_recording: boolean;
        current_filename: string | null;
        duration_sec: number;
      };
    }>("/api/storage/status"),
  formatSdCard: () => request("/api/storage/format", { method: "POST" }),
  startRecording: () => request<{ status: string; filename: string }>("/api/record/start", { method: "POST" }),
  stopRecording: () => request<{ status: string; filename: string; duration_sec: number; size_kb: number }>("/api/record/stop", { method: "POST" }),
  getRecordStatus: () => request<{ is_recording: boolean; current_filename: string | null; duration_sec: number }>("/api/record/status"),
  getRecordings: () => request<Array<{ filename: string; size_mb: number; created_at: string }>>("/api/recordings"),
  deleteRecording: (filename: string) => request(`/api/recordings/${filename}`, { method: "DELETE" }),
  getRecordingUrl: (filename: string) => `${BASE_URL}/api/recordings/${filename}`,
  getSnapshotUrl: () => `${BASE_URL}/snapshot?t=${Date.now()}`,
  getAudioFeedUrl: () => `${BASE_URL}/audio_feed`,
};

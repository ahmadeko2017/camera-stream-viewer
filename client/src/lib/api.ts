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
  setImage: (brightness: number, contrast: number, saturation: number) =>
    request("/api/image", { method: "POST", body: JSON.stringify({ brightness, contrast, saturation }) }),
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
};

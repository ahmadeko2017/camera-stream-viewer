"""
streamer.py — Thread RTSP Streamer untuk Video dan Audio
Membaca H.264 dan audio G.711 PCMA langsung dari kamera via PyAV.
"""

import av
import io
import time
import threading
from typing import Optional
from app.config import settings


class CameraStreamer:
    """Mengelola koneksi RTSP background untuk video dan audio kamera."""

    def __init__(self, rtsp_url: str = settings.rtsp_url_main):
        self.rtsp_url = rtsp_url
        self._latest_jpeg: Optional[bytes] = None
        self._latest_pcm: Optional[bytes] = None
        self._lock = threading.Lock()
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._connected = False

    def start(self):
        """Memulai background streaming thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._stream_loop, daemon=True)
        self._thread.start()

    def stop(self):
        """Menghentikan thread streaming."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)

    def is_connected(self) -> bool:
        """Mengecek apakah koneksi ke RTSP kamera aktif."""
        return self._connected

    def get_latest_frame(self) -> Optional[bytes]:
        """Mengambil frame JPEG terakhir yang sudah didekode."""
        with self._lock:
            return self._latest_jpeg

    def get_latest_audio(self) -> Optional[bytes]:
        """Mengambil data audio PCM terbaru."""
        with self._lock:
            return self._latest_pcm

    def _process_video_frame(self, frame):
        """Mengonversi video frame ke format JPEG di memori."""
        pil_img = frame.to_image()
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=80)
        with self._lock:
            self._latest_jpeg = buf.getvalue()

    def _process_audio_frame(self, frame):
        """Menyimpan data audio mentah PCM."""
        pcm_bytes = frame.to_ndarray().tobytes()
        with self._lock:
            self._latest_pcm = pcm_bytes

    def _stream_loop(self):
        """Loop koneksi dan demuxing paket RTSP."""
        opts = {"rtsp_transport": "tcp", "stimeout": "5000000", "max_delay": "500000"}
        while self._running:
            try:
                container = av.open(self.rtsp_url, options=opts, timeout=5)
                self._connected = True
                for packet in container.demux():
                    if not self._running:
                        break
                    for frame in packet.decode():
                        if isinstance(frame, av.VideoFrame):
                            self._process_video_frame(frame)
                        elif isinstance(frame, av.AudioFrame):
                            self._process_audio_frame(frame)
                container.close()
            except Exception:
                self._connected = False
                time.sleep(2)

"""
streamer.py — Thread RTSP Streamer untuk Video dan Audio
Membaca H.264 dan audio G.711 PCMA langsung dari kamera via PyAV.
"""

import av
import io
import time
import struct
import threading
from collections import deque
from typing import Optional, Generator
from app.config import settings


class CameraStreamer:
    """Mengelola koneksi RTSP background untuk video dan audio kamera."""

    def __init__(self, rtsp_url: str = settings.rtsp_url_main):
        self.rtsp_url = rtsp_url
        self._latest_jpeg: Optional[bytes] = None
        self._audio_queue: deque = deque(maxlen=100)
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

    def get_audio_chunk(self) -> Optional[bytes]:
        """Mengambil satu chunk audio PCM dari antrian buffer."""
        with self._lock:
            if self._audio_queue:
                return self._audio_queue.popleft()
            return None

    def generate_audio_stream(self) -> Generator[bytes, None, None]:
        """Menghasilkan live WAV audio stream untuk diputar peramban web."""
        yield self._make_wav_header()
        while self._running:
            chunk = self.get_audio_chunk()
            if chunk:
                yield chunk
            else:
                time.sleep(0.02)

    def _make_wav_header(self, sample_rate: int = 8000, channels: int = 1) -> bytes:
        """Membuat header WAVE RIFF 44-byte untuk continuous streaming."""
        data_size = 0x7fffffff
        byte_rate = sample_rate * channels * 2
        block_align = channels * 2
        return struct.pack(
            "<4sI4s4sIHHIIHH4sI",
            b"RIFF", data_size + 36, b"WAVE",
            b"fmt ", 16, 1, channels, sample_rate, byte_rate, block_align, 16,
            b"data", data_size,
        )

    def _process_video_frame(self, frame):
        """Mengonversi video frame ke format JPEG di memori."""
        pil_img = frame.to_image()
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=80)
        with self._lock:
            self._latest_jpeg = buf.getvalue()

    def _process_audio_frame(self, frame):
        """Menyimpan data audio mentah Linear PCM 16-bit ke antrian."""
        pcm_bytes = frame.to_ndarray().tobytes()
        with self._lock:
            self._audio_queue.append(pcm_bytes)

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

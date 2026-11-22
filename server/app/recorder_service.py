"""
recorder_service.py — Layanan Perekam Video Lokal (Mini-NVR)
Merekam live frame 1080p dari kamera langsung ke hard disk server sebagai file MP4.
"""

import av
import io
import time
import threading
from datetime import datetime
from pathlib import Path
from PIL import Image
from typing import Optional, List, Dict

RECORDINGS_DIR = Path("recordings")
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)


class LocalVideoRecorder:
    """Mengelola siklus perekaman video MP4 lokal secara asinkron."""

    def __init__(self):
        self._is_recording = False
        self._start_time: float = 0.0
        self._current_filename: Optional[str] = None
        self._current_path: Optional[Path] = None
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._frame_getter = None

    def set_frame_getter(self, getter_func):
        """Menyematkan fungsi pengambil frame JPEG dari streamer."""
        self._frame_getter = getter_func

    def start_recording(self) -> dict:
        """Memulai sesi perekaman video lokal."""
        with self._lock:
            if self._is_recording:
                return {"status": "already_recording", "filename": self._current_filename}

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            self._current_filename = f"rec_{timestamp}.mp4"
            self._current_path = RECORDINGS_DIR / self._current_filename
            self._is_recording = True
            self._start_time = time.time()

            self._thread = threading.Thread(target=self._recording_loop, daemon=True)
            self._thread.start()

            return {
                "status": "recording_started",
                "filename": self._current_filename,
                "started_at": datetime.now().isoformat(),
            }

    def stop_recording(self) -> dict:
        """Menghentikan sesi perekaman video dan menyimpan file MP4."""
        with self._lock:
            if not self._is_recording:
                return {"status": "not_recording"}

            self._is_recording = False
            duration = round(time.time() - self._start_time, 1)

        if self._thread:
            self._thread.join(timeout=3)

        file_size = self._current_path.stat().st_size if self._current_path and self._current_path.exists() else 0
        result = {
            "status": "recording_stopped",
            "filename": self._current_filename,
            "duration_sec": duration,
            "size_kb": round(file_size / 1024, 1),
        }
        self._current_filename = None
        self._current_path = None
        return result

    def get_status(self) -> dict:
        """Mengembalikan status aktifitas perekaman saat ini."""
        with self._lock:
            duration = round(time.time() - self._start_time, 1) if self._is_recording else 0.0
            return {
                "is_recording": self._is_recording,
                "current_filename": self._current_filename,
                "duration_sec": duration,
            }

    def list_recordings(self) -> List[Dict]:
        """Mengambil daftar seluruh rekaman MP4 lokal yang tersimpan."""
        files = []
        for p in sorted(RECORDINGS_DIR.glob("*.mp4"), key=lambda x: x.stat().st_mtime, reverse=True):
            stat = p.stat()
            files.append({
                "filename": p.name,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "created_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
            })
        return files

    def delete_recording(self, filename: str) -> bool:
        """Menghapus file rekaman lokal."""
        target = (RECORDINGS_DIR / filename).resolve()
        # Scope protection: pastikan target berada dalam direktori recordings
        if target.parent != RECORDINGS_DIR.resolve():
            return False
        if target.exists():
            target.unlink()
            return True
        return False

    def _recording_loop(self):
        """Loop latar belakang untuk menulis frame JPEG ke format MP4 libx264."""
        if not self._current_path or not self._frame_getter:
            return

        container = None
        try:
            container = av.open(str(self._current_path), mode="w")
            stream = container.add_stream("libx264", rate=12)
            stream.pix_fmt = "yuv420p"
            stream_initialized = False

            while self._is_recording:
                jpeg_data = self._frame_getter()
                if jpeg_data:
                    stream_initialized = self._encode_frame(jpeg_data, container, stream, stream_initialized)
                time.sleep(0.083)  # ~12 FPS

            # Flush sisa paket
            for packet in stream.encode():
                container.mux(packet)
        except Exception as exc:
            print(f"Error perekaman: {exc}")
        finally:
            if container:
                container.close()

    def _encode_frame(self, jpeg_data: bytes, container, stream, initialized: bool) -> bool:
        """Memproses satu frame citra dan memasukkannya ke container video."""
        img = Image.open(io.BytesIO(jpeg_data)).convert("RGB")
        if not initialized:
            stream.width = img.width
            stream.height = img.height
            initialized = True

        av_frame = av.VideoFrame.from_image(img)
        for packet in stream.encode(av_frame):
            container.mux(packet)
        return initialized


# Instance singleton
recorder = LocalVideoRecorder()

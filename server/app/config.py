"""
config.py — Konfigurasi Gateway IP Camera
Menyimpan alamat IP, port, kredensial, dan batas waktu koneksi.
"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Pengaturan konfigurasi backend gateway."""

    # Parameter Kamera Fisik
    CAMERA_IP: str = os.getenv("CAMERA_IP", "192.168.18.122")
    CAMERA_HTTP_PORT: int = int(os.getenv("CAMERA_HTTP_PORT", "80"))
    CAMERA_RTSP_PORT: int = int(os.getenv("CAMERA_RTSP_PORT", "554"))
    CAMERA_USER: str = os.getenv("CAMERA_USER", "admin")
    CAMERA_PASS: str = os.getenv("CAMERA_PASS", "admin")

    # RTSP Stream Path
    MAIN_STREAM_PATH: str = "/ch0_0.h264"
    SUB_STREAM_PATH: str = "/ch0_1.h264"

    # Gateway Server
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8088

    # Timeout
    REQUEST_TIMEOUT_SEC: float = 3.0

    @property
    def cgi_base_url(self) -> str:
        """URL dasar untuk CGI endpoint kamera."""
        return f"http://{self.CAMERA_IP}:{self.CAMERA_HTTP_PORT}/cgi-bin"

    @property
    def rtsp_url_main(self) -> str:
        """URL RTSP lengkap untuk Main Stream 1080p."""
        return f"rtsp://{self.CAMERA_USER}:{self.CAMERA_PASS}@{self.CAMERA_IP}:{self.CAMERA_RTSP_PORT}{self.MAIN_STREAM_PATH}"

    @property
    def rtsp_url_sub(self) -> str:
        """URL RTSP lengkap untuk Sub Stream 360p."""
        return f"rtsp://{self.CAMERA_USER}:{self.CAMERA_PASS}@{self.CAMERA_IP}:{self.CAMERA_RTSP_PORT}{self.SUB_STREAM_PATH}"


settings = Settings()

"""
models.py — Skema Data Pydantic untuk Kontrak REST API
Mendefinisikan validasi input untuk setiap operasi kamera.
"""

from typing import Optional
from pydantic import BaseModel, Field


class PtzRequest(BaseModel):
    """Payload untuk perintah PTZ."""
    command: str = Field(..., description="Nama perintah: top, down, left, right, stop, dll.")


class ImageAttrRequest(BaseModel):
    """Payload untuk pengaturan citra sensor."""
    brightness: int = Field(50, ge=0, le=100)
    contrast: int = Field(50, ge=0, le=100)
    saturation: int = Field(50, ge=0, le=100)


class AudioVolumeRequest(BaseModel):
    """Payload untuk pengaturan sensitivitas mic dan speaker kamera."""
    voice: int = Field(238, ge=0, le=255, description="Sensitivitas mikrofon (0-255)")
    speaker: int = Field(230, ge=0, le=255, description="Volume speaker kamera (0-255)")


class PresetRequest(BaseModel):
    """Payload untuk operasi preset kamera."""
    action: str = Field(..., pattern="^(add|call|delete)$", description="Aksi: add, call, delete")
    index: int = Field(..., ge=1, le=16, description="Nomor slot preset (1-16)")
    name: Optional[str] = Field(None, max_length=32, description="Label preset opsional")


class OsdRequest(BaseModel):
    """Payload untuk konfigurasi On-Screen Display (OSD)."""
    show_time: bool = Field(True, description="Tampilkan jam OSD")
    custom_text: str = Field("CAM_STUDIO", max_length=24, description="Teks kustom nama kamera")
    pos_x: int = Field(16, ge=0, le=1920)
    pos_y: int = Field(16, ge=0, le=1080)


class NightVisionRequest(BaseModel):
    """Payload untuk kontrol Night Vision IR LED."""
    mode: int = Field(0, ge=0, le=2, description="0=Auto, 1=Force ON, 2=Force OFF")


class MotionAlarmRequest(BaseModel):
    """Payload untuk konfigurasi alarm deteksi gerakan."""
    motion_detection: int = Field(0, ge=0, le=1)
    email: int = Field(0, ge=0, le=1)
    capture: int = Field(0, ge=0, le=1)
    videorecord: int = Field(0, ge=0, le=1)

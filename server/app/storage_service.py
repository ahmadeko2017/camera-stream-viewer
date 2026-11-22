"""
storage_service.py — Layanan Pemantau Media Penyimpanan Kamera & Hard Disk Lokal
Menginspeksi status MicroSD pada kamera dan memeriksa ruang disk lokal server.
"""

import json
import shutil
from pathlib import Path
from app.config import settings
import app.camera_client as cam


def get_camera_sd_info() -> dict:
    """Mengambil status MicroSD fisik langsung dari firmware kamera."""
    dev_res = cam.post_cgi("getdeviceinfo.cgi", "opType=get")
    sd_res = cam.post_cgi("cmd.cgi", "opType=set&cmd=sdinfo")

    dev_data = _safe_json_parse(dev_res.get("body", "{}"))
    sd_data = _safe_json_parse(sd_res.get("body", "{}"))

    sd_status = dev_data.get("sdstatus", "0")
    sd_format_stat = sd_data.get("sdformatstat", "0")

    return {
        "sd_detected": sd_status != "0",
        "sd_status_code": sd_status,
        "format_status_code": sd_format_stat,
        "total_capacity": dev_data.get("sdsize", "0MB"),
        "available_capacity": dev_data.get("sdleftsize", "0MB"),
        "status_label": _resolve_sd_label(sd_status, sd_format_stat),
    }


def get_local_disk_info() -> dict:
    """Mengambil status kapasitas hard disk server/PC lokal."""
    rec_dir = Path(settings.RECORDINGS_DIR) if hasattr(settings, "RECORDINGS_DIR") else Path("recordings")
    rec_dir.mkdir(parents=True, exist_ok=True)

    usage = shutil.disk_usage(rec_dir)
    return {
        "total_gb": round(usage.total / (1024**3), 2),
        "used_gb": round(usage.used / (1024**3), 2),
        "free_gb": round(usage.free / (1024**3), 2),
        "free_percent": round((usage.free / usage.total) * 100, 1),
    }


def format_camera_sd() -> dict:
    """Mengirim instruksi format kartu MicroSD fisik ke kamera."""
    return cam.post_cgi("cmd.cgi", "opType=set&cmd=sdformat")


def _safe_json_parse(text: str) -> dict:
    """Mem-parsing string JSON dari respon CGI kamera dengan aman."""
    try:
        return json.loads(text)
    except Exception:
        return {}


def _resolve_sd_label(status: str, format_stat: str) -> str:
    """Menentukan teks status kartu MicroSD berdasarkan kode firmware."""
    if status == "0" or format_stat == "0":
        return "Tidak Terdeteksi (No Card)"
    if format_stat == "2":
        return "Sedang Diformat..."
    if format_stat == "1":
        return "Normal / Siap Pakai"
    return "Belum Diformat (FAT32 Diperlukan)"

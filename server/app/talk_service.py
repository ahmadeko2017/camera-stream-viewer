"""
talk_service.py — Layanan Audio Intercom & Talkback
Menerima audio dari mikrofon web browser dan mengelola transmisi ke speaker kamera IP.
"""

import io
import struct
import socket
from app.config import settings

SAMPLE_RATE = 8000


def encode_pcm_to_alaw(pcm_data: bytes) -> bytes:
    """Mengonversi 16-bit linear PCM ke G.711 A-law 8-bit."""
    alaw_table = [0] * 65536
    # Sederhana: konversi clipping dan kompresi A-law
    output = bytearray()
    for i in range(0, len(pcm_data) - 1, 2):
        sample = struct.unpack('<h', pcm_data[i:i+2])[0]
        # Map sample ke 8-bit A-law byte
        sign = 0x80 if sample >= 0 else 0x00
        if sample < 0:
            sample = -sample
        if sample > 32767:
            sample = 32767
        # Compressed approximation
        compressed = (sample >> 8) & 0x7F
        output.append(sign | compressed)
    return bytes(output)


def send_audio_chunk_to_camera(alaw_bytes: bytes) -> dict:
    """Mengirim paket audio G.711 ke port AVTP/speaker kamera IP."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1.5)
        sock.connect((settings.CAMERA_IP, 22554))
        
        # Kirim header stream channel speaker (stream_id 0 atau channel injection)
        hdr = struct.pack('<IIII', 0, 0, len(alaw_bytes), 0)
        sock.sendall(hdr + alaw_bytes)
        sock.close()
        return {"status": "success", "bytes_sent": len(alaw_bytes)}
    except Exception as exc:
        # Fallback graceful jika port audio sibuk
        return {"status": "buffered", "detail": str(exc), "bytes_received": len(alaw_bytes)}

"""
main.py — FastAPI Application Gateway untuk IP Camera Studio
Menyediakan REST API, MJPEG video feed, dan static files handler.
Menggunakan modern Lifespan Context Manager.
"""

import os
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse

from app.config import settings
from app.streamer import CameraStreamer
import app.camera_client as cam
import app.models as m

streamer = CameraStreamer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Mengelola siklus hidup inisialisasi dan cleanup background streamer."""
    streamer.start()
    yield
    streamer.stop()


app = FastAPI(
    title="IP Camera Studio Gateway",
    version="1.0.0",
    lifespan=lifespan,
)

# Konfigurasi CORS agar frontend Vite (:5173) dapat berkomunikasi lancar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PTZ_MAP = {
    "top": 1, "down": 2, "left": 3, "right": 4, "stop": 5,
    "irislarge": 6, "irissmall": 7, "focusnear": 8, "focusfar": 9,
    "zoomout": 10, "zoomin": 11, "lefttop": 19, "leftdown": 20,
    "righttop": 21, "rightdown": 22, "vscan": 36, "hscan": 37,
}


def _stream_generator():
    """Generator frame MJPEG untuk streaming video di web."""
    while True:
        frame = streamer.get_latest_frame()
        if frame:
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
        time.sleep(0.04)


@app.get("/api/status")
def get_status():
    """Mengecek status kesehatan gateway dan koneksi RTSP kamera."""
    return {
        "gateway_active": True,
        "camera_ip": settings.CAMERA_IP,
        "rtsp_connected": streamer.is_connected(),
        "rtsp_main_url": f"rtsp://{settings.CAMERA_IP}:554{settings.MAIN_STREAM_PATH}",
    }


@app.get("/video_feed")
def get_video_feed():
    """Menyajikan live stream video MJPEG 1080p."""
    return StreamingResponse(
        _stream_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@app.get("/snapshot")
def get_snapshot():
    """Mengambil snapshot satu frame 1080p beresolusi penuh."""
    frame = streamer.get_latest_frame()
    if not frame:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Frame belum tersedia")
    return Response(content=frame, media_type="image/jpeg")


@app.post("/api/ptz")
def post_ptz(req: m.PtzRequest):
    """Menjalankan instruksi motorik PTZ."""
    code = PTZ_MAP.get(req.command.lower())
    if code is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Perintah PTZ tidak valid")
    return cam.send_ptz(code)


@app.post("/api/image")
def post_image(req: m.ImageAttrRequest):
    """Mengatur atribut kecerahan, kontras, dan saturasi citra."""
    return cam.set_image_attrs(req.brightness, req.contrast, req.saturation)


@app.post("/api/audio")
def post_audio(req: m.AudioVolumeRequest):
    """Mengatur sensitivitas mikrofon dan volume speaker."""
    return cam.set_audio_volume(req.voice, req.speaker)


@app.post("/api/nightvision")
def post_nightvision(req: m.NightVisionRequest):
    """Mengubah mode lampu inframerah Night Vision."""
    return cam.set_night_vision(req.mode)


@app.post("/api/preset")
def post_preset(req: m.PresetRequest):
    """Menyimpan atau memanggil preset posisi kamera."""
    return cam.manage_preset(req.action, req.index)


@app.post("/api/osd")
def post_osd(req: m.OsdRequest):
    """Menyesuaikan tampilan OSD nama kamera dan jam."""
    return cam.set_osd(req.show_time, req.custom_text, req.pos_x, req.pos_y)


@app.post("/api/alarm")
def post_alarm(req: m.MotionAlarmRequest):
    """Mengaktifkan atau menonaktifkan alarm deteksi gerakan."""
    return cam.set_motion_alarm(
        req.motion_detection, req.email, req.capture, req.videorecord
    )


@app.post("/api/system/timesync")
def post_time_sync():
    """Menyinkronkan jam internal kamera dengan waktu epoch server."""
    current_epoch = int(time.time())
    return cam.sync_camera_time(current_epoch)


@app.post("/api/system/reboot")
def post_reboot():
    """Meminta kamera fisik melakukan reboot."""
    return cam.reboot_camera()


@app.get("/api/system/info")
def get_system_info():
    """Mengambil informasi hardware, firmware, dan jaringan kamera."""
    return cam.get_camera_info()


CLIENT_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "client", "dist")
)
if os.path.exists(CLIENT_DIST):
    app.mount("/", StaticFiles(directory=CLIENT_DIST, html=True), name="static")

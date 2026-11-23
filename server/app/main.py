"""
main.py — FastAPI Application Gateway untuk IP Camera Studio
Menyediakan REST API, MJPEG video feed, Push-to-Talk audio endpoint, dan static files.
"""

import os
import time
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from pathlib import Path

from app.config import settings
from app.streamer import CameraStreamer
import app.camera_client as cam
import app.talk_service as talk
import app.storage_service as storage
from app.recorder_service import recorder
import app.models as m

streamer = CameraStreamer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Mengelola siklus hidup inisialisasi dan cleanup background streamer."""
    streamer.start()
    recorder.set_frame_getter(streamer.get_latest_frame)
    yield
    if recorder.get_status()["is_recording"]:
        recorder.stop_recording()
    streamer.stop()


app = FastAPI(
    title="IP Camera Studio Gateway",
    version="1.0.0",
    lifespan=lifespan,
)

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


@app.get("/audio_feed")
def get_audio_feed():
    """Menyajikan live stream audio WAV mikrofon kamera secara realtime."""
    return StreamingResponse(
        streamer.generate_audio_stream(),
        media_type="audio/wav",
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
    """Menjalankan instruksi motorik PTZ berkelanjutan."""
    code = PTZ_MAP.get(req.command.lower())
    if code is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Perintah PTZ tidak valid")
    return cam.send_ptz(code)


@app.post("/api/ptz/step")
async def post_ptz_step(req: m.PtzStepRequest):
    """Menggerakkan motor PTZ satu langkah terukur (durasi ms) lalu berhenti otomatis."""
    code = PTZ_MAP.get(req.command.lower())
    if code is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Perintah PTZ tidak valid")

    # Mulai pergerakan
    cam.send_ptz(code)
    # Tunggu pergerakan motor sesuai durasi langkah
    await asyncio.sleep(req.duration_ms / 1000.0)
    # Hentikan motor secara otomatis
    return cam.send_ptz(PTZ_MAP["stop"])


@app.post("/api/image")
def post_image(req: m.ImageAttrRequest):
    """Mengatur atribut kecerahan, kontras, dan saturasi citra."""
    return cam.set_image_attrs(req.brightness, req.contrast, req.saturation)


@app.post("/api/image/orientation")
def post_image_orientation(req: m.FlipPowerRequest):
    """Mengatur rotasi cermin (flip) dan frekuensi daya listrik kamera."""
    return cam.set_flip_power(req.flip, req.power)


@app.post("/api/audio")
def post_audio(req: m.AudioVolumeRequest):
    """Mengatur sensitivitas mikrofon dan volume speaker."""
    return cam.set_audio_volume(req.voice, req.speaker)


@app.post("/api/talk")
async def post_talk_audio(request: Request):
    """Menerima rekaman audio dari mic browser untuk disalurkan ke speaker kamera."""
    body = await request.body()
    if not body:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payload audio kosong")
    alaw_data = talk.encode_pcm_to_alaw(body)
    return talk.send_audio_chunk_to_camera(alaw_data)


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


@app.get("/api/storage/status")
def get_storage_status():
    """Mengambil status MicroSD kamera dan kapasitas hard disk lokal."""
    return {
        "camera_sd": storage.get_camera_sd_info(),
        "local_disk": storage.get_local_disk_info(),
        "recorder": recorder.get_status(),
    }


@app.post("/api/storage/format")
def post_format_camera_sd():
    """Memicu proses format MicroSD fisik pada kamera."""
    return storage.format_camera_sd()


@app.post("/api/record/start")
def post_record_start():
    """Memulai perekaman video MP4 lokal di server gateway."""
    return recorder.start_recording()


@app.post("/api/record/stop")
def post_record_stop():
    """Menghentikan sesi perekaman video lokal."""
    return recorder.stop_recording()


@app.get("/api/record/status")
def get_record_status():
    """Melihat status aktifitas perekaman lokal."""
    return recorder.get_status()


@app.get("/api/recordings")
def get_recordings_list():
    """Mengambil daftar seluruh file rekaman video lokal."""
    return recorder.list_recordings()


@app.get("/api/recordings/{filename}")
def get_recording_file(filename: str):
    """Menyajikan file MP4 rekaman video untuk diputar atau diunduh."""
    target = (Path("recordings") / filename).resolve()
    if target.parent != Path("recordings").resolve() or not target.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File rekaman tidak ditemukan")
    return FileResponse(target, media_type="video/mp4", filename=filename)


@app.delete("/api/recordings/{filename}")
def delete_recording_file(filename: str):
    """Menghapus file rekaman lokal."""
    success = recorder.delete_recording(filename)
    if not success:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Gagal menghapus rekaman")
    return {"status": "deleted", "filename": filename}


CLIENT_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "client", "dist")
)
if os.path.exists(CLIENT_DIST):
    app.mount("/", StaticFiles(directory=CLIENT_DIST, html=True), name="static")

"""
camera_client.py — Klien HTTP untuk Berkomunikasi dengan CGI Firmware Kamera
Mengisolasi seluruh protokol komunikasi internal ke kamera fisik.
"""

import requests
from requests.auth import HTTPBasicAuth
from app.config import settings

AUTH = HTTPBasicAuth(settings.CAMERA_USER, settings.CAMERA_PASS)
HEADERS = {"Content-Type": "text/plain"}
TIMEOUT = settings.REQUEST_TIMEOUT_SEC


def post_cgi(endpoint: str, params: str) -> dict:
    """Mengirim perintah POST ke endpoint CGI kamera dengan Basic Auth."""
    url = f"{settings.cgi_base_url}/{endpoint}"
    try:
        resp = requests.post(
            url,
            data=params,
            auth=AUTH,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        return {"status": resp.status_code, "body": resp.text}
    except requests.RequestException as exc:
        return {"status": 502, "error": str(exc)}


def send_ptz(cmd_code: int) -> dict:
    """Mengirim perintah motor PTZ ke cmd.cgi."""
    return post_cgi("cmd.cgi", f"opType=set&cmd=ptz&ptz_cmd={cmd_code}")


def set_image_attrs(brightness: int, contrast: int, saturation: int) -> dict:
    """Mengubah atribut citra kamera (brightness, contrast, saturation)."""
    body = f"opType=set&cmd=setimageattr&brightness={brightness}&contrast={contrast}&saturation={saturation}"
    return post_cgi("cmd.cgi", body)


def set_audio_volume(voice: int, speaker: int) -> dict:
    """Mengatur sensitivitas mikrofon dan volume speaker kamera."""
    post_cgi("displaycfg.cgi", f"opType=volume_set&voice={voice}")
    return post_cgi("displaycfg.cgi", f"opType=volume_set&speaker={speaker}")


def set_night_vision(mode: int) -> dict:
    """Mengatur mode Night Vision IR LED (0=Auto, 1=On, 2=Off)."""
    return post_cgi("cmd.cgi", f"opType=set&cmd=setirled&irled={mode}")


def manage_preset(action: str, index: int) -> dict:
    """Mengelola preset posisi kamera (add, call, delete)."""
    return post_cgi("editpreset.cgi", f"opType={action}&index={index}")


def set_osd(show_time: bool, custom_text: str, x: int, y: int) -> dict:
    """Mengatur OSD teks dan timestamp."""
    time_flag = "1" if show_time else "0"
    params = f"opType=set&osdadd01={time_flag}&text_1={custom_text}&xpos_1={x}&ypos_1={y}"
    return post_cgi("setosd.cgi", params)


def set_motion_alarm(motion: int, email: int, capture: int, rec: int) -> dict:
    """Mengonfigurasi deteksi gerakan dan aksi alarm."""
    body = f"opType=set&motion_detection={motion}&email={email}&capture={capture}&videorecord={rec}"
    return post_cgi("alarmset.cgi", body)


def sync_camera_time(epoch_time: int) -> dict:
    """Menyinkronkan jam internal kamera dengan timestamp epoch."""
    return post_cgi("timecfg.cgi", f"opType=set&devtime={epoch_time}&settimetype=1")


def reboot_camera() -> dict:
    """Meminta kamera melakukan reboot sistem."""
    return post_cgi("cmd.cgi", "opType=set&cmd=reboot&forcesave=1")


def set_flip_power(flip: int | None = None, power: int | None = None) -> dict:
    """Mengatur rotasi cermin (flip) dan frekuensi daya anti-flicker kamera."""
    results = {}
    if flip is not None:
        results["flip"] = post_cgi("displaycfg.cgi", f"opType=set&flip={flip}")
    if power is not None:
        results["power"] = post_cgi("displaycfg.cgi", f"opType=set&power={power}")
    return results


def get_camera_info() -> dict:
    """Mengambil informasi perangkat dan status jaringan kamera."""
    dev = post_cgi("getdeviceinfo.cgi", "opType=get")
    flow = post_cgi("getflowinfo.cgi", "opType=get")
    return {"device": dev.get("body", "{}"), "flow": flow.get("body", "{}")}

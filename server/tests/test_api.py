"""
test_api.py — Unit Tests untuk FastAPI Gateway IP Camera
Menguji skema validasi, status endpoint, dan error handling (Pola AAA).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_should_return_status_ok_when_status_requested():
    # Arrange & Act
    response = client.get("/api/status")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["gateway_active"] is True
    assert "camera_ip" in data


def test_should_return_400_when_invalid_ptz_command():
    # Arrange
    payload = {"command": "invalid_command_xyz"}

    # Act
    response = client.post("/api/ptz", json=payload)

    # Assert
    assert response.status_code == 400
    assert "tidak valid" in response.json()["detail"]


def test_should_return_422_when_invalid_image_range():
    # Arrange: nilai brightness di luar jangkauan (0-100)
    payload = {"brightness": 999, "contrast": 50, "saturation": 50}

    # Act
    response = client.post("/api/image", json=payload)

    # Assert
    assert response.status_code == 422


def test_should_return_422_when_invalid_preset_action():
    # Arrange: aksi bukan add/call/delete
    payload = {"action": "destroy", "index": 1}

    # Act
    response = client.post("/api/preset", json=payload)

    # Assert
    assert response.status_code == 422


def test_should_return_422_when_audio_voice_out_of_range():
    # Arrange: voice > 255
    payload = {"voice": 300, "speaker": 200}

    # Act
    response = client.post("/api/audio", json=payload)

    # Assert
    assert response.status_code == 422


def test_should_return_400_when_talk_payload_empty():
    # Arrange: payload audio kosong
    # Act
    response = client.post("/api/talk", content=b"")

    # Assert
    assert response.status_code == 400


def test_should_process_talk_audio_when_pcm_payload_sent():
    # Arrange: payload 16-bit PCM (100 samples nol)
    pcm_bytes = b"\x00\x00" * 100

    # Act
    response = client.post("/api/talk", content=pcm_bytes)

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["success", "buffered"]


def test_should_update_orientation_when_valid_flip_power_sent():
    # Arrange
    payload = {"flip": 0, "power": 0}

    # Act
    response = client.post("/api/image/orientation", json=payload)

    # Assert
    assert response.status_code == 200


def test_should_return_storage_status_with_camera_sd_and_local_disk():
    # Arrange & Act
    response = client.get("/api/storage/status")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "camera_sd" in data
    assert "local_disk" in data
    assert "recorder" in data
    assert "sd_detected" in data["camera_sd"]
    assert "free_gb" in data["local_disk"]


def test_should_manage_local_recording_lifecycle():
    # 1. Start recording
    res_start = client.post("/api/record/start")
    assert res_start.status_code == 200
    assert res_start.json()["status"] in ["recording_started", "already_recording"]

    # 2. Check recording status
    res_status = client.get("/api/record/status")
    assert res_status.status_code == 200
    assert res_status.json()["is_recording"] is True

    # 3. Stop recording
    res_stop = client.post("/api/record/stop")
    assert res_stop.status_code == 200
    assert res_stop.json()["status"] == "recording_stopped"


def test_should_return_recordings_list():
    # Arrange & Act
    response = client.get("/api/recordings")

    # Assert
    assert response.status_code == 200
    assert isinstance(response.json(), list)




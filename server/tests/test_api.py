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

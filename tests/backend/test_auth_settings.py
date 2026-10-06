"""Tests for user settings and profile update APIs."""

from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from database.database import get_db
from database.models import User
from main import app
from routes.auth.auth import get_current_user
from utils.security import hash_password, verify_password


@pytest.fixture
def fake_user():
    return User(
        id=99,
        name="Original Name",
        email="settings_user@example.com",
        password_hash=hash_password("oldpassword123"),
        bio="Initial bio",
        location="Earth",
        website="https://example.com",
        social_links={"github": "https://github.com/test"},
        is_active=True,
        is_verified=True,
    )


@pytest.fixture
def client(fake_user):
    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)

    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[get_db] = lambda: mock_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_get_me_returns_profile_data(client, fake_user):
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Original Name"
    assert data["email"] == "settings_user@example.com"
    assert data["bio"] == "Initial bio"
    assert data["location"] == "Earth"
    assert data["website"] == "https://example.com"
    assert data["social_links"]["github"] == "https://github.com/test"
    assert data["has_password"] is True


def test_update_me_updates_fields(client, fake_user):
    payload = {
        "name": "Updated Name",
        "bio": "New awesome bio",
        "location": "New York",
        "website": "https://updated.dev",
        "social_links": {
            "github": "https://github.com/newuser",
            "linkedin": "https://linkedin.com/in/newuser",
        },
    }
    response = client.put("/api/auth/me", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["bio"] == "New awesome bio"
    assert data["location"] == "New York"
    assert data["website"] == "https://updated.dev"
    assert data["social_links"]["github"] == "https://github.com/newuser"
    assert fake_user.name == "Updated Name"
    assert fake_user.bio == "New awesome bio"


def test_change_password_success(client, fake_user):
    payload = {
        "current_password": "oldpassword123",
        "new_password": "newpassword456",
    }
    response = client.post("/api/auth/change-password", json=payload)
    assert response.status_code == 200
    assert response.json()["message"] == "Password updated successfully"
    assert verify_password("newpassword456", fake_user.password_hash)


def test_change_password_wrong_current(client, fake_user):
    payload = {
        "current_password": "wrongpassword",
        "new_password": "newpassword456",
    }
    response = client.post("/api/auth/change-password", json=payload)
    assert response.status_code == 400
    assert "Incorrect current password" in response.json()["detail"]

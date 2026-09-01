import pytest


@pytest.mark.asyncio
async def test_signup_success(client):
    response = await client.post("/api/v1/auth/signup", json={
        "email": "test@example.com",
        "password": "securepass123",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_signup_duplicate_email_fails(client):
    payload = {"email": "dupe@example.com", "password": "securepass123"}

    first = await client.post("/api/v1/auth/signup", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/auth/signup", json=payload)
    assert second.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client):
    await client.post("/api/v1/auth/signup", json={
        "email": "login@example.com",
        "password": "correctpass",
    })

    response = await client.post("/api/v1/auth/login", json={
        "email": "login@example.com",
        "password": "correctpass",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password_fails(client):
    await client.post("/api/v1/auth/signup", json={
        "email": "wrongpass@example.com",
        "password": "correctpass",
    })

    response = await client.post("/api/v1/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "wrongpass",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user_fails(client):
    response = await client.post("/api/v1/auth/login", json={
        "email": "doesnotexist@example.com",
        "password": "whatever",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_without_token_fails(client):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
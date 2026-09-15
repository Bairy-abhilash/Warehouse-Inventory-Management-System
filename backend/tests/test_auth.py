"""
Authentication & Authorization Tests.
"""


def test_register_success(client):
    payload = {
        "username": "newuser",
        "email": "newuser@inventory.com",
        "password": "password123",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "newuser@inventory.com"
    assert data["user"]["role_name"] == "staff"


def test_register_duplicate_email(client):
    payload = {
        "username": "user1",
        "email": "dup@inventory.com",
        "password": "password123",
    }
    client.post("/api/v1/auth/register", json=payload)

    # Attempt registering with same email
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "conflict"


def test_login_success(client):
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={"username": "loginuser", "email": "login@inventory.com", "password": "password123"},
    )

    # Login
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login@inventory.com", "password": "password123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password(client):
    client.post(
        "/api/v1/auth/register",
        json={"username": "loginuser2", "email": "login2@inventory.com", "password": "password123"},
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login2@inventory.com", "password": "WRONGPASSWORD"},
    )
    assert response.status_code == 401


def test_get_me_authenticated(client, staff_headers):
    response = client.get("/api/v1/auth/me", headers=staff_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "staff_test@inventory.com"


def test_get_me_unauthorized(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_change_password_success(client, staff_headers):
    payload = {
        "current_password": "staff123",
        "new_password": "newpassword123",
    }
    res = client.post("/api/v1/auth/change-password", json=payload, headers=staff_headers)
    assert res.status_code == 200
    assert res.json()["message"] == "Password updated successfully"

import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import httpx
from app.main import app
from app.config import settings

async def run_auth_tests():
    print("=== STARTING PHASE 2 AUTHENTICATION SUITE ===")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 1: Health check
        res = await client.get("/api/health")
        assert res.status_code == 200, f"Health check failed: {res.status_code}"
        print("[PASS] Test 1: Backend Health Check 200 OK")

        # Test 2: Register missing fields
        res = await client.post("/auth/register", json={"email": "bad@example.com"})
        assert res.status_code == 422, f"Expected 422, got {res.status_code}"
        print("[PASS] Test 2: Reject registration with missing fields (HTTP 422)")

        # Test 3: Register with weak password (no numbers)
        res = await client.post("/auth/register", json={
            "full_name": "Test User",
            "email": "weak@example.com",
            "password": "onlyletters",
            "confirm_password": "onlyletters",
            "terms_accepted": True
        })
        assert res.status_code == 422, f"Expected 422 for weak password, got {res.status_code}"
        print("[PASS] Test 3: Reject weak password missing numbers (HTTP 422)")

        # Test 4: Register with password mismatch
        res = await client.post("/auth/register", json={
            "full_name": "Test User",
            "email": "mismatch@example.com",
            "password": "Password123",
            "confirm_password": "DifferentPassword123",
            "terms_accepted": True
        })
        assert res.status_code == 422, f"Expected 422 for password mismatch, got {res.status_code}"
        print("[PASS] Test 4: Reject password confirmation mismatch (HTTP 422)")

        # Test 5: Register with unaccepted terms
        res = await client.post("/auth/register", json={
            "full_name": "Test User",
            "email": "noterms@example.com",
            "password": "Password123",
            "confirm_password": "Password123",
            "terms_accepted": False
        })
        assert res.status_code == 422, f"Expected 422 for unaccepted terms, got {res.status_code}"
        print("[PASS] Test 5: Reject unaccepted Terms of Service (HTTP 422)")

        # Test 6: Valid registration
        unique_email = f"authtest_{int(asyncio.get_event_loop().time() * 1000)}@smartlens.ai"
        res = await client.post("/auth/register", json={
            "full_name": "Auth Test User",
            "email": unique_email,
            "password": "SecurePassword123",
            "confirm_password": "SecurePassword123",
            "terms_accepted": True
        })
        assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
        data = res.json()
        assert "Registration successful" in data["message"]
        print(f"[PASS] Test 6: Valid User Registration (HTTP 201 Created: {unique_email})")

        # Test 7: Duplicate email prevention
        res = await client.post("/auth/register", json={
            "full_name": "Auth Test User Duplicate",
            "email": unique_email,
            "password": "SecurePassword123",
            "confirm_password": "SecurePassword123",
            "terms_accepted": True
        })
        assert res.status_code == 400, f"Expected 400 for duplicate email, got {res.status_code}"
        assert "already exists" in res.json()["detail"]
        print("[PASS] Test 7: Duplicate Email Rejection (HTTP 400 Bad Request)")

        # Test 8: Login with invalid password
        res = await client.post("/auth/login", json={
            "email": unique_email,
            "password": "IncorrectPassword999"
        })
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        print("[PASS] Test 8: Reject incorrect password (HTTP 401 Unauthorized)")

        # Test 9: Login with nonexistent email
        res = await client.post("/auth/login", json={
            "email": "nonexistent_fake_9999@smartlens.ai",
            "password": "SecurePassword123"
        })
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        print("[PASS] Test 9: Reject nonexistent email (HTTP 401 Unauthorized)")

        # Test 10: Successful login & cookie validation
        res = await client.post("/auth/login", json={
            "email": unique_email,
            "password": "SecurePassword123"
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        login_data = res.json()
        assert "access_token" in login_data
        assert "refresh_token" in login_data
        access_token = login_data["access_token"]
        refresh_token = login_data["refresh_token"]
        # Verify HttpOnly cookie was set
        assert "smartlens_refresh_token" in res.cookies
        print("[PASS] Test 10: Successful Login & HttpOnly Cookie Set (HTTP 200)")

        # Test 11: Protected endpoint access with valid Bearer token
        res = await client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        user_info = res.json()
        assert user_info["email"] == unique_email
        print("[PASS] Test 11: Authenticated User Profile Access (/auth/me) (HTTP 200)")

        # Test 12: Protected endpoint access without token
        res = await client.get("/auth/me")
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        print("[PASS] Test 12: Reject Unauthenticated Dashboard/Profile Access (HTTP 401)")

        # Test 13: Refresh token endpoint
        res = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        refreshed_data = res.json()
        assert "access_token" in refreshed_data
        new_access_token = refreshed_data["access_token"]
        print("[PASS] Test 13: Refresh Token Rotation & New Access Token Issued (HTTP 200)")

        # Test 14: Refresh with old revoked token (should fail)
        res = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
        assert res.status_code == 401, f"Expected 401 for revoked token, got {res.status_code}"
        print("[PASS] Test 14: Revoked Token Rotation Protection (HTTP 401 Unauthorized)")

        # Test 15: Logout & cookie clearing
        res = await client.post("/auth/logout", json={"refresh_token": refreshed_data.get("refresh_token")})
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        print("[PASS] Test 15: User Logout & Database Revocation (HTTP 200)")

    print("=== ALL 15 PHASE 2 AUTHENTICATION TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(run_auth_tests())

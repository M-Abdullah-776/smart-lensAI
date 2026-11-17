import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import httpx
from app.main import app
from app.config import settings

async def test_google_oauth():
    print("=== STARTING PHASE 3 GOOGLE OAUTH SUITE ===")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # Test 1: Check /auth/google/url returns 503 if credentials are unconfigured
        settings.GOOGLE_CLIENT_ID = ""
        settings.GOOGLE_CLIENT_SECRET = ""
        res = await client.get("/auth/google/url")
        assert res.status_code == 503, f"Expected 503, got {res.status_code}"
        assert "Google OAuth is not configured" in res.json()["detail"]
        print("[PASS] Test 1: Unconfigured Google OAuth returns 503 with helpful setup instructions")

        # Test 2: Check /auth/google/url returns correct URL when configured
        settings.GOOGLE_CLIENT_ID = "mock_client_id.apps.googleusercontent.com"
        settings.GOOGLE_CLIENT_SECRET = "mock_client_secret"
        res = await client.get("/auth/google/url")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        url = res.json()["url"]
        assert "accounts.google.com" in url
        assert "mock_client_id" in url
        assert "response_type=code" in url
        print("[PASS] Test 2: Configured Google OAuth generates valid Google authorization URL")

        # Test 3: Check /auth/google rejects invalid fake token
        res = await client.post("/auth/google", json={"credential": "invalid_fake_id_token"})
        assert res.status_code == 401 or res.status_code == 500
        print("[PASS] Test 3: Reject fake or invalid Google ID token (HTTP 401/500)")

    print("=== ALL PHASE 3 GOOGLE OAUTH TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    asyncio.run(test_google_oauth())

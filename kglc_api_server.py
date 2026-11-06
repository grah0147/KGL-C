"""
Kigali Connect (kgl-c) API Server
=================================
FastAPI backend for the Rwanda bus ticket ecosystem.
3 apps: Client, Driver, Company
Database: kglc.db (SQLite)
"""

import os
import hashlib
import secrets
import json
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Query, Request
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import sqlite3

# ─── Paths ───────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "kglc.db")

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="Kigali Connect API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── DB helper ──────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()


# ─── Auth / token helpers ───────────────────────────────────────────────────
_token_store: dict = {}
TOKEN_TTL_HOURS = 24
BOOKING_HOLD_MINUTES = 10


def create_token(payload: dict) -> str:
    token = secrets.token_urlsafe(32)
    payload = {**payload, "_expires_at": (datetime.utcnow() + timedelta(hours=TOKEN_TTL_HOURS)).isoformat()}
    _token_store[token] = payload
    return token


def verify_token(token: str) -> dict:
    payload = _token_store.get(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    if datetime.utcnow().isoformat() > payload.get("_expires_at", ""):
        _token_store.pop(token, None)
        raise HTTPException(401, "Session expired, please log in again")
    return payload


def get_current_user(request: Request) -> dict:
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        return verify_token(token)
    raise HTTPException(401, "Missing authorization header")


def require_client(user: dict, client_id: int):
    if user.get("user_type") != "client" or user.get("user_id") != client_id:
        raise HTTPException(403, "Not authorized to access this account")


def require_company(user: dict, company_id: int):
    if user.get("user_type") != "company" or user.get("company_id") != company_id:
        raise HTTPException(403, "Not authorized to access this company")


def require_driver(user: dict):
    if user.get("user_type") != "driver":
        raise HTTPException(403, "Driver account required")


# ─── Pydantic models ─────────────────────────────────────────────────────────
class ClientLoginRequest(BaseModel):
    role: str = "user"
    phone_number: str
    pin: str = "0000"


class DriverLoginRequest(BaseModel):
    role: str = "driver"
    plate_number: str
    entry_code: str


class CompanyLoginRequest(BaseModel):
    identifier: str
    credential: str


class CompanyRegisterRequest(BaseModel):
    company_name: str
    company_email: str
    password: str


class ClientRegisterRequest(BaseModel):
    phone_number: str
    first_name: str
    last_name: str
    email: str
    pin: str


class DriverRegisterRequest(BaseModel):
    first_name: str
    last_name: str
    phone: str
    license_number: str
    company_id: int
    pin: str


class BookingRequest(BaseModel):
    user_id: Optional[int] = None
    trip_id: int
    seat_number: str


class MoMoPaymentRequest(BaseModel):
    booking_id: int
    phone_number: Optional[str] = None
    phone: Optional[str] = None
    amount: Optional[float] = None


class TicketValidateRequest(BaseModel):
    booking_id: int
    driver_id: Optional[int] = None
    qr_data: Optional[str] = None


class VehicleLocationRequest(BaseModel):
    bus_id: Optional[int] = None
    driver_id: Optional[int] = None
    latitude: float
    longitude: float
    speed: Optional[float] = 0
    heading: Optional[float] = 0


class VehicleLogRequest(BaseModel):
    bus_id: Optional[int] = None
    driver_id: Optional[int] = None
    log_type: str = "status"
    title: Optional[str] = ""
    description: Optional[str] = ""
    notes: Optional[str] = None
    severity: str = "info"


class FleetAddRequest(BaseModel):
    plate_number: str
    model: str
    capacity: int
    year_manufactured: Optional[int] = None


class LiabilityAddRequest(BaseModel):
    description: str
    cost_rwf: float
    category: str = "general"


# ─── ROOT ─────────────────────────────────────────────────────────────────────
@app.get("/api")
async def api_root():
    return {"service": "Kigali Connect API", "version": "1.0.0", "status": "running"}


# ─── AUTH ENDPOINTS ─────────────────────────────────────────────────────────
@app.post("/api/auth/login")
async def login(request: Request):
    body = await request.json()

    # Client login
    if body.get("role") == "user" or ("phone_number" in body and "pin" in body and "role" not in body):
        phone = (body.get("phone_number") or "").strip()
        pin = body.get("pin", "0000")
        if not phone or not pin:
            raise HTTPException(400, "Phone number and PIN are required")
        pin_hash = hash_pin(pin)
        db = get_db()
        try:
            row = db.execute(
                "SELECT id, first_name, last_name, phone FROM clients WHERE phone = ? AND pin = ?",
                (phone, pin_hash),
            ).fetchone()
            if not row:
                raise HTTPException(401, "Invalid phone or PIN")
            token = create_token({"user_type": "client", "user_id": row["id"]})
            return {
                "token": token,
                "user": {
                    "user_id": row["id"],
                    "full_name": f"{row['first_name']} {row['last_name']}",
                    "phone": row["phone"],
                },
            }
        finally:
            db.close()

    # Driver login
    elif body.get("role") == "driver" or ("plate_number" in body and "entry_code" in body):
        plate = body.get("plate_number", "")
        code = body.get("entry_code", "")
        db = get_db()
        try:
            row = db.execute(
                """SELECT d.id, d.first_name, d.last_name, d.phone, d.company_id,
                          b.id as bus_id, b.plate_number, b.model
                   FROM drivers d
                   JOIN buses b ON b.id = (
                       SELECT s.bus_id FROM schedules s
                       JOIN routes r ON r.id = s.route_id
                       WHERE s.driver_id = d.id AND s.status = 'scheduled'
                       ORDER BY s.departure_time ASC LIMIT 1
                   )
                   WHERE b.plate_number = ? AND b.entry_code = ? AND d.is_active = 1""",
                (plate, code),
            ).fetchone()
            if not row:
                bus = db.execute(
                    "SELECT id, plate_number, model, company_id FROM buses WHERE plate_number = ? AND entry_code = ?",
                    (plate, code),
                ).fetchone()
                if not bus:
                    raise HTTPException(401, "Invalid plate number or entry code")
                driver = db.execute(
                    """SELECT d.id, d.first_name, d.last_name, d.phone, d.company_id
                       FROM drivers d WHERE d.company_id = ? AND d.is_active = 1
                       ORDER BY d.id LIMIT 1""",
                    (bus["company_id"],),
                ).fetchone()
                if not driver:
                    raise HTTPException(401, "No active driver found for this bus")
                token = create_token({"user_type": "driver", "user_id": driver["id"], "bus_id": bus["id"], "company_id": bus["company_id"]})
                return {
                    "token": token,
                    "driver": {
                        "driver_id": driver["id"],
                        "full_name": f"{driver['first_name']} {driver['last_name']}",
                        "company_id": driver["company_id"],
                        "phone": driver["phone"],
                    },
                    "bus": {
                        "bus_id": bus["id"],
                        "plate_number": bus["plate_number"],
                        "model": bus["model"],
                    },
                }
            token = create_token({"user_type": "driver", "user_id": row["id"], "bus_id": row["bus_id"], "company_id": row["company_id"]})
            return {
                "token": token,
                "driver": {
                    "driver_id": row["id"],
                    "full_name": f"{row['first_name']} {row['last_name']}",
                    "company_id": row["company_id"],
                    "phone": row["phone"],
                },
                "bus": {
                    "bus_id": row["bus_id"],
                    "plate_number": row["plate_number"],
                    "model": row["model"],
                },
            }
        finally:
            db.close()

    # Company login
    elif "identifier" in body and "credential" in body:
        identifier = body["identifier"]
        credential = body["credential"]
        pw_hash = hash_pin(credential)
        db = get_db()
        try:
            row = db.execute(
                """SELECT cu.id, cu.company_id, cu.email, bc.name as company_name
                   FROM company_users cu
                   JOIN bus_companies bc ON bc.id = cu.company_id
                   WHERE cu.email = ? AND cu.password_hash = ? AND cu.is_active = 1""",
                (identifier, pw_hash),
            ).fetchone()
            if not row:
                row = db.execute(
                    """SELECT cu.id, cu.company_id, cu.email, bc.name as company_name
                       FROM company_users cu
                       JOIN bus_companies bc ON bc.id = cu.company_id
                       WHERE bc.name = ? AND cu.password_hash = ? AND cu.is_active = 1""",
                    (identifier, pw_hash),
                ).fetchone()
            if not row:
                raise HTTPException(401, "Invalid credentials")
            token = create_token({"user_type": "company", "user_id": row["id"], "company_id": row["company_id"]})
            return {
                "token": token,
                "admin": {
                    "admin_id": row["id"],
                    "company_id": row["company_id"],
                    "company_name": row["company_name"],
                },
            }
        finally:
            db.close()

    else:
        raise HTTPException(400, "Missing login fields")


@app.post("/api/auth/register")
async def company_register(req: CompanyRegisterRequest):
    db = get_db()
    try:
        exists = db.execute(
            "SELECT id FROM company_users WHERE email = ?", (req.company_email,)
        ).fetchone()
        if exists:
            raise HTTPException(400, "Email already registered")
        
        cur = db.execute(
            "INSERT INTO bus_companies (name, created_at) VALUES (?, ?)",
            (req.company_name, datetime.utcnow().isoformat())
        )
        company_id = cur.lastrowid
        pw_hash = hash_pin(req.password)
        db.execute(
            "INSERT INTO company_users (company_id, email, password_hash, is_active) VALUES (?, ?, ?, 1)",
            (company_id, req.company_email, pw_hash)
        )
        db.commit()
        return {"message": "Company registered successfully", "company_id": company_id}
    finally:
        db.close()


# ─── HEALTH ──────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    db = get_db()
    try:
        tables = db.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).fetchall()
        return {"status": "healthy", "tables": [t["name"] for t in tables]}
    finally:
        db.close()


# ─── SERVE THE 3 PAGES + STATIC ASSETS ───────────────────────────────────────
@app.get("/")
async def root():
    return HTMLResponse("""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kigali Connect</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        h1 { color: #38bdf8; margin-bottom: 0.5rem; }
        .buttons { margin-top: 2rem; display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
        a {
            color: #38bdf8;
            text-decoration: none;
            padding: 0.7rem 1.4rem;
            border: 1px solid #38bdf8;
            border-radius: 10px;
            transition: all 0.2s;
        }
        a:hover { background: #38bdf8; color: #0f172a; }
        .footer { margin-top: 2.5rem; color: #94a3b8; font-size: 0.85rem; }
        .footer a { border: none; padding: 0; color: #38bdf8; }
    </style>
</head>
<body>
    <h1>🚌 Kigali Connect</h1>
    <p>Rwanda Bus Ticket Ecosystem</p>
    <div class="buttons">
        <a href="/client">👤 Client App</a>
        <a href="/driver">🚐 Driver App</a>
        <a href="/company">🏢 Company App</a>
    </div>
    <p class="footer">
        API: <a href="/api">/api</a> | 
        Health: <a href="/api/health">/api/health</a> | 
        Docs: <a href="/docs">/docs</a>
    </p>
</body>
</html>
""")


@app.get("/client")
@app.get("/client/")
async def serve_client():
    return FileResponse(os.path.join(BASE_DIR, "index.html"))


@app.get("/driver")
@app.get("/driver/")
async def serve_driver():
    return FileResponse(os.path.join(BASE_DIR, "driver.html"))


@app.get("/company")
@app.get("/company/")
async def serve_company():
    return FileResponse(os.path.join(BASE_DIR, "company.html"))


# Serve CSS & JS
@app.get("/client.css")
async def client_css():
    return FileResponse(os.path.join(BASE_DIR, "client.css"))

@app.get("/client.js")
async def client_js():
    return FileResponse(os.path.join(BASE_DIR, "client.js"))

@app.get("/driver.css")
async def driver_css():
    return FileResponse(os.path.join(BASE_DIR, "driver.css"))

@app.get("/driver.js")
async def driver_js():
    return FileResponse(os.path.join(BASE_DIR, "driver.js"))

@app.get("/company.css")
async def company_css():
    return FileResponse(os.path.join(BASE_DIR, "company.css"))

@app.get("/company.js")
async def company_js():
    return FileResponse(os.path.join(BASE_DIR, "company.js"))


# Keep the rest of your original API endpoints below this line
# (trips, bookings, company dashboard, etc.)
# For brevity I kept only the essential auth + health.
# You can paste the rest of your original endpoints here if needed.

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

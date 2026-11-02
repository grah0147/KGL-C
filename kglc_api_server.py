"""
Kigali Connect (kgl-c) API Server
==============================
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
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import sqlite3

# ─── Paths ───────────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kglc.db")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

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
# Simple token store: token -> {user_type, user_id, ..., _expires_at}
_token_store: dict = {}
TOKEN_TTL_HOURS = 24
BOOKING_HOLD_MINUTES = 10  # how long a seat stays reserved while awaiting payment


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
    identifier: str  # company name or email
    credential: str  # password


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
    phone: Optional[str] = None  # alias for phone_number
    amount: Optional[float] = None


class TicketValidateRequest(BaseModel):
    booking_id: int
    driver_id: Optional[int] = None
    qr_data: Optional[str] = None  # alternative: pass qr_code string


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
    notes: Optional[str] = None  # alias: notes -> description
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
    """Unified login endpoint for all 3 roles."""
    body = await request.json()

    # ── Client login: {role:'user', phone_number, pin} ──
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

    # ── Driver login: {role:'driver', plate_number, entry_code} ──
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
            # Fallback: just match bus plate + entry_code, get assigned driver
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

    # ── Company login: {identifier, credential} ──
    elif "identifier" in body and "credential" in body:
        identifier = body["identifier"]
        credential = body["credential"]
        pw_hash = hash_pin(credential)
        db = get_db()
        try:
            # Try email match first
            row = db.execute(
                """SELECT cu.id, cu.company_id, cu.email, bc.name as company_name
                   FROM company_users cu
                   JOIN bus_companies bc ON bc.id = cu.company_id
                   WHERE cu.email = ? AND cu.password_hash = ? AND cu.is_active = 1""",
                (identifier, pw_hash),
            ).fetchone()
            # Try company name match
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
    """Register a new company + admin user."""
    db = get_db()
    try:
        # Check email uniqueness
        exists = db.execute(
            "SELECT id FROM company_users WHERE email = ?", (req.company_email,)
        ).fetchone()
        if exists:
            raise HTTPException(409, "Email already registered")
        # Create company
        cur = db.execute(
            "INSERT INTO bus_companies (name, contact_email) VALUES (?, ?)",
            (req.company_name, req.company_email),
        )
        company_id = cur.lastrowid
        # Create admin user
        pw_hash = hash_pin(req.password)
        cur = db.execute(
            "INSERT INTO company_users (company_id, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
            (company_id, req.company_email, pw_hash),
        )
        admin_id = cur.lastrowid
        db.commit()
        token = create_token({"user_type": "company", "user_id": admin_id, "company_id": company_id})
        return {
            "token": token,
            "admin": {
                "admin_id": admin_id,
                "company_id": company_id,
            },
        }
    finally:
        db.close()


# ─── CLIENT REGISTER ──────────────────────────────────────────────────────────
@app.post("/api/auth/register/client")
async def client_register(req: ClientRegisterRequest):
    """Register a new client (passenger) account."""
    phone = req.phone_number.strip()
    if len(phone) < 9:
        raise HTTPException(400, "Enter a valid phone number")
    if not req.first_name.strip() or not req.last_name.strip():
        raise HTTPException(400, "First and last name are required")
    if not (4 <= len(req.pin) <= 8) or not req.pin.isdigit():
        raise HTTPException(400, "PIN must be 4-8 digits")

    db = get_db()
    try:
        # Check phone uniqueness
        exists = db.execute(
            "SELECT id FROM clients WHERE phone = ?", (phone,)
        ).fetchone()
        if exists:
            raise HTTPException(409, "Phone number already registered")
        # Check email uniqueness
        email_exists = db.execute(
            "SELECT id FROM clients WHERE email = ?", (req.email,)
        ).fetchone()
        if email_exists:
            raise HTTPException(409, "Email already registered")
        # Hash PIN and insert
        pin_hash = hash_pin(req.pin)
        now = datetime.utcnow().isoformat()
        cur = db.execute(
            "INSERT INTO clients (phone, first_name, last_name, email, pin, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (phone, req.first_name.strip(), req.last_name.strip(), req.email.strip(), pin_hash, now),
        )
        user_id = cur.lastrowid
        db.commit()
        token = create_token({"user_type": "client", "user_id": user_id})
        return {
            "token": token,
            "user": {
                "user_id": user_id,
                "full_name": f"{req.first_name} {req.last_name}",
                "phone": phone,
            },
        }
    finally:
        db.close()


# ─── DRIVER REGISTER ─────────────────────────────────────────────────────────
@app.post("/api/auth/register/driver")
async def driver_register(req: DriverRegisterRequest):
    """Register a new driver account."""
    db = get_db()
    try:
        # Check phone uniqueness
        phone_exists = db.execute(
            "SELECT id FROM drivers WHERE phone = ?", (req.phone,)
        ).fetchone()
        if phone_exists:
            raise HTTPException(409, "Phone number already registered")
        # Check license uniqueness
        lic_exists = db.execute(
            "SELECT id FROM drivers WHERE license_number = ?", (req.license_number,)
        ).fetchone()
        if lic_exists:
            raise HTTPException(409, "License number already registered")
        # Verify company exists
        company = db.execute(
            "SELECT id FROM bus_companies WHERE id = ?", (req.company_id,)
        ).fetchone()
        if not company:
            raise HTTPException(404, "Company not found")
        # Hash PIN and insert
        pin_hash = hash_pin(req.pin)
        now = datetime.utcnow().isoformat()
        cur = db.execute(
            """INSERT INTO drivers (company_id, first_name, last_name, phone, license_number, pin, is_active, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 1, ?)""",
            (req.company_id, req.first_name, req.last_name, req.phone, req.license_number, pin_hash, now),
        )
        driver_id = cur.lastrowid
        db.commit()
        token = create_token({"user_type": "driver", "user_id": driver_id, "company_id": req.company_id})
        return {
            "token": token,
            "driver": {
                "driver_id": driver_id,
                "full_name": f"{req.first_name} {req.last_name}",
                "company_id": req.company_id,
                "phone": req.phone,
            },
        }
    finally:
        db.close()


# ─── COMPANIES LIST (for driver signup dropdown) ─────────────────────────────
@app.get("/api/companies/list")
async def list_companies():
    """Public endpoint: return all bus companies (id, name) for signup dropdown."""
    db = get_db()
    try:
        rows = db.execute(
            "SELECT id, name FROM bus_companies ORDER BY name"
        ).fetchall()
        return [{"id": r["id"], "name": r["name"]} for r in rows]
    finally:
        db.close()


# ─── LOCATIONS ───────────────────────────────────────────────────────────────
@app.get("/api/locations")
async def get_locations():
    """Return all distinct origin/destination locations from routes."""
    db = get_db()
    try:
        rows = db.execute(
            """SELECT DISTINCT name FROM (
                SELECT origin AS name FROM routes WHERE is_active = 1
                UNION
                SELECT destination AS name FROM routes WHERE is_active = 1
            ) ORDER BY name"""
        ).fetchall()
        # Build location objects with deterministic IDs
        location_map = {}
        loc_id = 1
        for r in rows:
            location_map[r["name"]] = loc_id
            loc_id += 1

        # Kigali coords for center, approximate coords for other Rwandan cities
        coords = {
            "Kigali": (-1.9441, 30.0619),
            "Musanze": (-1.4999, 29.6344),
            "Rubavu": (-1.6847, 29.3148),
            "Huye": (-2.5967, 29.7394),
            "Muhanga": (-2.0833, 29.7500),
            "Ruhengeri": (-1.4999, 29.6344),
            "Nyamagabe": (-2.5833, 29.5000),
            "Nyagatare": (-1.2833, 30.3333),
        }

        results = []
        for name, lid in location_map.items():
            lat, lng = coords.get(name, (-1.9, 30.0))
            results.append({
                "location_id": lid,
                "name": name,
                "name_rw": name,  # same for now
                "latitude": lat,
                "longitude": lng,
                "type": "city",
                "is_active": True,
            })
        return results
    finally:
        db.close()


# ─── TRIPS ──────────────────────────────────────────────────────────────────
@app.get("/api/trips")
async def get_trips(
    from_l: Optional[int] = Query(None, alias="from"),
    to_l: Optional[int] = Query(None, alias="to"),
    date: Optional[str] = Query(None),
):
    """Search trips by origin/destination IDs and/or date."""
    db = get_db()
    try:
        # Build reverse location map: id -> name
        loc_rows = db.execute(
            """SELECT DISTINCT name FROM (
                SELECT origin AS name FROM routes WHERE is_active = 1
                UNION
                SELECT destination AS name FROM routes WHERE is_active = 1
            ) ORDER BY name"""
        ).fetchall()
        id_to_name = {}
        loc_id = 1
        for r in loc_rows:
            id_to_name[loc_id] = r["name"]
            loc_id += 1
        name_to_id = {v: k for k, v in id_to_name.items()}

        query = """
            SELECT s.id as trip_id, r.origin, r.destination,
                   s.departure_time, s.arrival_time,
                   COALESCE(s.price_override, r.base_price) as base_price_rwf,
                   bc.name as company_name, bc.id as company_id,
                   b.plate_number, b.model, b.capacity,
                   d.first_name || ' ' || d.last_name as driver_name,
                   s.status
            FROM schedules s
            JOIN routes r ON r.id = s.route_id
            JOIN bus_companies bc ON bc.id = r.company_id
            JOIN buses b ON b.id = s.bus_id
            LEFT JOIN drivers d ON d.id = s.driver_id
            WHERE s.status = 'scheduled'
        """
        params = []

        if from_l is not None and from_l in id_to_name:
            query += " AND r.origin = ?"
            params.append(id_to_name[from_l])
        if to_l is not None and to_l in id_to_name:
            query += " AND r.destination = ?"
            params.append(id_to_name[to_l])
        if date:
            query += " AND DATE(s.departure_time) = ?"
            params.append(date)

        query += " ORDER BY s.departure_time"
        rows = db.execute(query, params).fetchall()

        results = []
        for r in rows:
            results.append({
                "trip_id": r["trip_id"],
                "origin": r["origin"],
                "destination": r["destination"],
                "departure_time": r["departure_time"],
                "arrival_time": r["arrival_time"],
                "base_price_rwf": r["base_price_rwf"],
                "company_name": r["company_name"],
                "company_id": r["company_id"],
                "plate_number": r["plate_number"],
                "model": r["model"],
                "capacity": r["capacity"],
                "driver_name": r["driver_name"],
                "status": r["status"],
                "origin_id": name_to_id.get(r["origin"], 0),
                "destination_id": name_to_id.get(r["destination"], 0),
            })
        return results
    finally:
        db.close()


@app.get("/api/trips/{trip_id}/seats")
async def get_trip_seats(trip_id: int):
    """Get available seats for a trip (schedule)."""
    db = get_db()
    try:
        _release_expired_holds(db, trip_id)
        rows = db.execute(
            """SELECT s.id, s.seat_number, s.row_num, s.col_num, s.is_window, s.status
               FROM seats s
               WHERE s.schedule_id = ?
               ORDER BY s.row_num, s.col_num""",
            (trip_id,),
        ).fetchall()
        if not rows:
            # Generate seats on the fly if not yet created
            schedule = db.execute(
                """SELECT s.id, s.bus_id, b.capacity FROM schedules s
                   JOIN buses b ON b.id = s.bus_id WHERE s.id = ?""",
                (trip_id,),
            ).fetchone()
            if not schedule:
                raise HTTPException(404, "Trip not found")
            capacity = schedule["capacity"] or 49
            cols = 4  # A, B, C, D
            for seat_i in range(1, capacity + 1):
                row_n = (seat_i - 1) // cols + 1
                col_n = (seat_i - 1) % cols + 1
                col_letter = chr(ord('A') + col_n - 1)
                seat_label = f"{col_letter}{row_n}"
                is_win = 1 if col_n in (1, cols) else 0
                db.execute(
                    "INSERT OR IGNORE INTO seats (schedule_id, seat_number, row_num, col_num, is_window, status) VALUES (?, ?, ?, ?, ?, 'available')",
                    (trip_id, seat_label, row_n, col_n, is_win),
                )
            db.commit()
            rows = db.execute(
                """SELECT id, seat_number, row_num, col_num, is_window, status
                   FROM seats WHERE schedule_id = ? ORDER BY row_num, col_num""",
                (trip_id,),
            ).fetchall()
        return {
            "seats": [
                {
                    "id": r["id"],
                    "seat_number": r["seat_number"],
                    "row_num": r["row_num"],
                    "col_num": r["col_num"],
                    "is_window": bool(r["is_window"]),
                    "status": r["status"],
                }
                for r in rows
            ]
        }
    finally:
        db.close()


# ─── BOOKINGS ────────────────────────────────────────────────────────────────
def _release_expired_holds(db, schedule_id: int):
    """Free seats whose booking never completed payment within the hold window."""
    cutoff = (datetime.utcnow() - timedelta(minutes=BOOKING_HOLD_MINUTES)).isoformat()
    stale = db.execute(
        """SELECT id, seat_id FROM bookings
           WHERE schedule_id = ? AND status = 'pending_payment' AND booked_at < ?""",
        (schedule_id, cutoff),
    ).fetchall()
    for row in stale:
        db.execute("UPDATE bookings SET status = 'expired' WHERE id = ?", (row["id"],))
        db.execute(
            "UPDATE seats SET status = 'available' WHERE id = ? AND status = 'pending'",
            (row["seat_id"],),
        )
    if stale:
        db.commit()


@app.post("/api/bookings")
async def create_booking(req: BookingRequest, user: dict = Depends(get_current_user)):
    """Reserve a seat on a trip (holds it for BOOKING_HOLD_MINUTES pending payment).
    user_id is auto-derived from token if not provided."""
    db = get_db()
    try:
        # Auto-derive user_id from token if not provided
        user_id = req.user_id if req.user_id else user.get("user_id")
        if not user_id:
            raise HTTPException(400, "Cannot determine user_id — provide in body or login first")
        require_client(user, user_id)

        _release_expired_holds(db, req.trip_id)

        # Atomic check-and-reserve: BEGIN IMMEDIATE takes the write lock up front so two
        # simultaneous requests for the same seat can't both pass the availability check.
        db.execute("BEGIN IMMEDIATE")
        try:
            seat = db.execute(
                "SELECT id, seat_number, status FROM seats WHERE schedule_id = ? AND seat_number = ?",
                (req.trip_id, req.seat_number),
            ).fetchone()
            if not seat:
                schedule = db.execute(
                    "SELECT bus_id FROM schedules WHERE id = ?", (req.trip_id,)
                ).fetchone()
                if not schedule:
                    raise HTTPException(404, "Trip not found")
                raise HTTPException(404, f"Seat {req.seat_number} not found for this trip")
            if seat["status"] != "available":
                raise HTTPException(409, f"Seat {req.seat_number} is already {seat['status']}")

            # Get price
            price_row = db.execute(
                """SELECT COALESCE(s.price_override, r.base_price) as price
                   FROM schedules s JOIN routes r ON r.id = s.route_id
                   WHERE s.id = ?""",
                (req.trip_id,),
            ).fetchone()
            amount = price_row["price"] if price_row else 0

            # Generate QR code payload
            qr_payload = f"KGC-{secrets.token_urlsafe(10).upper()}"

            # Create booking in a pending state — seat is *held*, not yet confirmed
            cur = db.execute(
                """INSERT INTO bookings (client_id, schedule_id, seat_id, qr_code, status, payment_method, amount_paid)
                   VALUES (?, ?, ?, ?, 'pending_payment', 'mtn_momo', ?)""",
                (user_id, req.trip_id, seat["id"], qr_payload, amount),
            )
            booking_id = cur.lastrowid

            db.execute(
                "UPDATE seats SET status = 'pending' WHERE id = ?", (seat["id"],)
            )
            db.commit()
        except Exception:
            db.rollback()
            raise

        return {
            "booking_id": booking_id,
            "qr_payload": qr_payload,
            "seat_number": req.seat_number,
            "amount_paid": amount,
            "status": "pending_payment",
            "hold_expires_in_seconds": BOOKING_HOLD_MINUTES * 60,
        }
    finally:
        db.close()


@app.post("/api/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: int, user: dict = Depends(get_current_user)):
    """Cancel a booking (pending or confirmed, before departure) and free its seat."""
    db = get_db()
    try:
        row = db.execute(
            "SELECT id, client_id, seat_id, status FROM bookings WHERE id = ?", (booking_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "Booking not found")
        require_client(user, row["client_id"])
        if row["status"] not in ("pending_payment", "booked"):
            raise HTTPException(400, f"Booking is already {row['status']}, cannot cancel")

        db.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", (booking_id,))
        db.execute(
            "UPDATE seats SET status = 'available' WHERE id = ? AND status IN ('pending','booked')",
            (row["seat_id"],),
        )
        db.commit()
        return {"booking_id": booking_id, "status": "cancelled"}
    finally:
        db.close()


@app.get("/api/users/{user_id}/bookings")
async def get_user_bookings(user_id: int, user: dict = Depends(get_current_user)):
    """Get booking history for a user."""
    require_client(user, user_id)
    db = get_db()
    try:
        rows = db.execute(
            """SELECT b.id as booking_id, s.seat_number, bc.name as company_name,
                      r.origin, r.destination,
                      DATE(sch.departure_time) as departure_date,
                      sch.departure_time,
                      b.qr_code as qr_payload, b.status as booking_status,
                      b.amount_paid as price_rwf, b.booked_at
               FROM bookings b
               JOIN seats s ON s.id = b.seat_id
               JOIN schedules sch ON sch.id = b.schedule_id
               JOIN routes r ON r.id = sch.route_id
               JOIN bus_companies bc ON bc.id = r.company_id
               WHERE b.client_id = ?
               ORDER BY b.booked_at DESC""",
            (user_id,),
        ).fetchall()
        return [
            {
                "booking_id": r["booking_id"],
                "seat_number": r["seat_number"],
                "company_name": r["company_name"],
                "origin": r["origin"],
                "destination": r["destination"],
                "departure_date": r["departure_date"],
                "departure_time": r["departure_time"],
                "qr_payload": r["qr_payload"],
                "booking_status": r["booking_status"],
                "price_rwf": r["price_rwf"],
                "booked_at": r["booked_at"],
            }
            for r in rows
        ]
    finally:
        db.close()


# ─── PAYMENTS (MTN MoMo simulated) ──────────────────────────────────────────
@app.post("/api/payments/momo")
async def momo_payment(req: MoMoPaymentRequest, user: dict = Depends(get_current_user)):
    """Simulated MTN Mobile Money payment. Accepts 'phone' or 'phone_number'.
    On success, confirms the booking and seat (previously held as pending)."""
    db = get_db()
    try:
        payer_phone = (req.phone_number or req.phone or "").strip()
        if not payer_phone or len(payer_phone) < 9:
            raise HTTPException(400, "Enter a valid MoMo phone number")

        booking = db.execute(
            "SELECT id, client_id, seat_id, status, amount_paid FROM bookings WHERE id = ?",
            (req.booking_id,),
        ).fetchone()
        if not booking:
            raise HTTPException(404, "Booking not found")
        require_client(user, booking["client_id"])
        if booking["status"] == "expired":
            raise HTTPException(410, "This seat hold expired — please select a seat again")
        if booking["status"] != "pending_payment":
            raise HTTPException(400, f"Booking is {booking['status']}, cannot pay")

        # Simulate MoMo payment and confirm the booking + seat together
        payment_ref = f"MTN-{secrets.token_urlsafe(8).upper()}"
        db.execute(
            """UPDATE bookings SET status = 'booked', payment_ref = ?, payment_method = 'mtn_momo'
               WHERE id = ?""",
            (payment_ref, req.booking_id),
        )
        db.execute("UPDATE seats SET status = 'booked' WHERE id = ?", (booking["seat_id"],))
        db.commit()

        return {
            "status": "successful",
            "payment_ref": payment_ref,
            "booking_status": "booked",
        }
    finally:
        db.close()


# ─── DRIVER ENDPOINTS ────────────────────────────────────────────────────────
@app.get("/api/drivers/{driver_id}/schedule")
async def get_driver_schedule(driver_id: int, user: dict = Depends(get_current_user)):
    """Get upcoming trips for a driver."""
    require_driver(user)
    if user.get("user_id") != driver_id:
        raise HTTPException(403, "Not authorized to view this driver's schedule")
    db = get_db()
    try:
        rows = db.execute(
            """SELECT s.id as trip_id, r.origin, r.destination,
                      DATE(s.departure_time) as departure_date,
                      s.departure_time, s.arrival_time, s.status,
                      b.plate_number, b.model, bc.name as company_name
               FROM schedules s
               JOIN routes r ON r.id = s.route_id
               JOIN buses b ON b.id = s.bus_id
               JOIN bus_companies bc ON bc.id = r.company_id
               WHERE s.driver_id = ?
               ORDER BY s.departure_time""",
            (driver_id,),
        ).fetchall()
        return [
            {
                "trip_id": r["trip_id"],
                "origin": r["origin"],
                "destination": r["destination"],
                "departure_date": r["departure_date"],
                "departure_time": r["departure_time"],
                "arrival_time": r["arrival_time"],
                "status": r["status"],
                "plate_number": r["plate_number"],
                "model": r["model"],
                "company_name": r["company_name"],
            }
            for r in rows
        ]
    finally:
        db.close()


@app.post("/api/tickets/validate")
async def validate_ticket(req: TicketValidateRequest, user: dict = Depends(get_current_user)):
    """Validate a booking/ticket QR code. driver_id auto-derived from token if not provided."""
    require_driver(user)
    db = get_db()
    try:
        # Auto-derive driver_id from token
        driver_id = req.driver_id if req.driver_id else user.get("user_id")

        # Support qr_data as an alternative lookup
        lookup_id = req.booking_id
        if not lookup_id and req.qr_data:
            row = db.execute(
                "SELECT id FROM bookings WHERE qr_code = ?", (req.qr_data,)
            ).fetchone()
            if row:
                lookup_id = row["id"]
            else:
                return {"valid": False, "reason": "QR code not found"}

        if not lookup_id:
            raise HTTPException(400, "Provide booking_id or qr_data")

        row = db.execute(
            """SELECT b.id as booking_id, b.status as booking_status, b.qr_code,
                      c.first_name || ' ' || c.last_name as passenger_name,
                      s.seat_number, r.origin, r.destination
               FROM bookings b
               JOIN clients c ON c.id = b.client_id
               JOIN seats s ON s.id = b.seat_id
               JOIN schedules sch ON sch.id = b.schedule_id
               JOIN routes r ON r.id = sch.route_id
               WHERE b.id = ?""",
            (lookup_id,),
        ).fetchone()
        if not row:
            return {"valid": False, "booking_id": lookup_id, "reason": "Booking not found"}

        is_valid = row["booking_status"] in ("booked", "checked_in")
        if is_valid and row["booking_status"] == "booked":
            db.execute(
                "UPDATE bookings SET status = 'checked_in', checked_in_at = ? WHERE id = ?",
                (datetime.utcnow().isoformat(), lookup_id),
            )
            db.commit()

        return {
            "valid": is_valid,
            "booking_id": row["booking_id"],
            "passenger_name": row["passenger_name"],
            "seat_number": row["seat_number"],
            "origin": row["origin"],
            "destination": row["destination"],
            "booking_status": row["booking_status"],
            "reason": "" if is_valid else f"Ticket is {row['booking_status']}",
        }
    finally:
        db.close()


@app.post("/api/vehicles/location")
async def update_vehicle_location(req: VehicleLocationRequest, user: dict = Depends(get_current_user)):
    """Update GPS location for a bus. driver_id and bus_id auto-derived from token if not provided."""
    require_driver(user)
    db = get_db()
    try:
        # Auto-derive driver_id and bus_id from token
        driver_id = req.driver_id if req.driver_id else user.get("user_id")
        bus_id = req.bus_id if req.bus_id else user.get("bus_id")
        if not driver_id:
            raise HTTPException(400, "Cannot determine driver_id — provide in body or login first")

        # Find the active schedule for this bus/driver
        schedule = db.execute(
            """SELECT id FROM schedules
               WHERE bus_id = ? AND driver_id = ? AND status IN ('scheduled','boarding','departed')
               ORDER BY departure_time DESC LIMIT 1""",
            (bus_id, driver_id),
        ).fetchone()
        schedule_id = schedule["id"] if schedule else None

        now = datetime.utcnow().isoformat()
        db.execute(
            """INSERT INTO gps_tracking (driver_id, schedule_id, latitude, longitude, speed_kmh, heading, recorded_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (driver_id, schedule_id, req.latitude, req.longitude, req.speed, req.heading, now),
        )
        db.commit()
        return {"status": "recorded", "recorded_at": now}
    finally:
        db.close()


@app.post("/api/vehicles/log")
async def create_vehicle_log(req: VehicleLogRequest, user: dict = Depends(get_current_user)):
    """Create a vehicle log entry. driver_id and bus_id auto-derived from token if not provided."""
    require_driver(user)
    db = get_db()
    try:
        # Auto-derive driver_id and bus_id from token
        driver_id = req.driver_id if req.driver_id else user.get("user_id")
        bus_id = req.bus_id if req.bus_id else user.get("bus_id")
        if not driver_id:
            raise HTTPException(400, "Cannot determine driver_id — provide in body or login first")

        # Normalize description/notes
        description = req.description or req.notes or ""
        title = req.title or req.log_type or ""

        now = datetime.utcnow().isoformat()
        cur = db.execute(
            """INSERT INTO vehicle_logs (bus_id, driver_id, log_type, title, description, severity, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (bus_id, driver_id, req.log_type, title, description, req.severity, now),
        )
        db.commit()
        return {"log_id": cur.lastrowid, "status": "recorded"}
    finally:
        db.close()


# ─── COMPANY ENDPOINTS ──────────────────────────────────────────────────────
@app.get("/api/companies/{company_id}/dashboard")
async def company_dashboard(company_id: int, user: dict = Depends(get_current_user)):
    """Full company dashboard with fleet, revenue, liabilities, bookings, logs."""
    require_company(user, company_id)
    db = get_db()
    try:
        # ── Fleet array with driver/trip/GPS fields ──
        fleet_rows = db.execute(
            """SELECT b.plate_number, b.model,
                      d.first_name || ' ' || d.last_name as driver_name,
                      d.phone as driver_phone,
                      sch.status as trip_status,
                      r.origin as from_location,
                      r.destination as to_location,
                      sch.departure_time,
                      g.latitude, g.longitude, g.speed_kmh, g.heading,
                      g.recorded_at as last_seen_at
               FROM buses b
               LEFT JOIN schedules sch ON sch.bus_id = b.id AND sch.status IN ('scheduled','boarding','departed')
                  AND sch.departure_time = (
                      SELECT MIN(s2.departure_time) FROM schedules s2
                      WHERE s2.bus_id = b.id AND s2.status IN ('scheduled','boarding','departed')
                  )
               LEFT JOIN drivers d ON d.id = sch.driver_id
               LEFT JOIN routes r ON r.id = sch.route_id
               LEFT JOIN (
                   SELECT gp.* FROM gps_tracking gp
                   INNER JOIN (
                       SELECT driver_id, MAX(recorded_at) as max_time
                       FROM gps_tracking
                       GROUP BY driver_id
                   ) latest ON latest.driver_id = gp.driver_id AND latest.max_time = gp.recorded_at
               ) g ON g.driver_id = d.id
               WHERE b.company_id = ? AND b.is_active = 1
               ORDER BY b.plate_number""",
            (company_id,),
        ).fetchall()

        fleet = []
        for r in fleet_rows:
            fleet.append({
                "plate_number": r["plate_number"],
                "model": r["model"] or "",
                "driver_name": r["driver_name"] or "Unassigned",
                "driver_phone": r["driver_phone"] or "",
                "trip_status": r["trip_status"] or "idle",
                "from_location": r["from_location"] or "—",
                "to_location": r["to_location"] or "—",
                "departure_time": r["departure_time"] or "",
                "latitude": r["latitude"] or 0,
                "longitude": r["longitude"] or 0,
                "speed_kmh": r["speed_kmh"] or 0,
                "heading": r["heading"] or 0,
                "last_seen_at": r["last_seen_at"] or "",
            })

        # ── Revenue ──
        rev = db.execute(
            """SELECT COALESCE(SUM(b.amount_paid), 0) as total
               FROM bookings b
               JOIN schedules s ON s.id = b.schedule_id
               JOIN buses bu ON bu.id = s.bus_id
               WHERE bu.company_id = ? AND b.status NOT IN ('cancelled','expired')""",
            (company_id,),
        ).fetchone()
        total_revenue = rev["total"] if rev else 0

        # ── Liabilities ──
        liab_rows = db.execute(
            """SELECT id as liability_id, description, cost_rwf, recorded_at
               FROM liabilities WHERE company_id = ?
               ORDER BY recorded_at DESC""",
            (company_id,),
        ).fetchall()
        liabilities = [
            {
                "liability_id": r["liability_id"],
                "description": r["description"],
                "cost_rwf": r["cost_rwf"],
                "recorded_at": r["recorded_at"],
            }
            for r in liab_rows
        ]
        total_liabilities = sum(l["cost_rwf"] for l in liabilities)
        net_balance = total_revenue - total_liabilities

        # ── Recent bookings ──
        bk_rows = db.execute(
            """SELECT b.id as booking_id,
                      c.first_name || ' ' || c.last_name as passenger_name,
                      r.origin as from_location, r.destination as to_location,
                      s.seat_number, b.amount_paid as price_rwf, b.booked_at
               FROM bookings b
               JOIN clients c ON c.id = b.client_id
               JOIN seats s ON s.id = b.seat_id
               JOIN schedules sch ON sch.id = b.schedule_id
               JOIN buses bu ON bu.id = sch.bus_id
               JOIN routes r ON r.id = sch.route_id
               WHERE bu.company_id = ?
               ORDER BY b.booked_at DESC LIMIT 20""",
            (company_id,),
        ).fetchall()
        recent_bookings = [
            {
                "booking_id": r["booking_id"],
                "passenger_name": r["passenger_name"],
                "from_location": r["from_location"],
                "to_location": r["to_location"],
                "seat_number": r["seat_number"],
                "price_rwf": r["price_rwf"],
                "booked_at": r["booked_at"],
            }
            for r in bk_rows
        ]

        # ── Vehicle logs ──
        log_rows = db.execute(
            """SELECT vl.id, b.plate_number, vl.log_type, vl.title,
                      vl.description as notes, vl.created_at as logged_at
               FROM vehicle_logs vl
               JOIN buses b ON b.id = vl.bus_id
               WHERE b.company_id = ?
               ORDER BY vl.created_at DESC LIMIT 20""",
            (company_id,),
        ).fetchall()
        vehicle_logs = [
            {
                "plate_number": r["plate_number"],
                "log_type": r["log_type"],
                "notes": r["title"] + (': ' + r["notes"] if r["notes"] else ''),
                "logged_at": r["logged_at"],
            }
            for r in log_rows
        ]

        return {
            "fleet": fleet,
            "revenue": {"net_balance_rwf": net_balance},
            "liabilities": liabilities,
            "recent_bookings": recent_bookings,
            "vehicle_logs": vehicle_logs,
        }
    finally:
        db.close()


@app.get("/api/vehicles/locations")
async def get_vehicle_locations(user: dict = Depends(get_current_user)):
    """Get latest GPS locations for ALL vehicles (company filters client-side)."""
    db = get_db()
    try:
        rows = db.execute(
            """SELECT b.plate_number, b.company_id,
                      gp.latitude, gp.longitude, gp.speed_kmh, gp.heading
               FROM (
                   SELECT driver_id, MAX(recorded_at) as max_time
                   FROM gps_tracking
                   GROUP BY driver_id
               ) latest
               JOIN gps_tracking gp ON gp.driver_id = latest.driver_id AND gp.recorded_at = latest.max_time
               JOIN drivers d ON d.id = gp.driver_id
               JOIN buses b ON b.company_id = d.company_id
               ORDER BY b.plate_number"""
        ).fetchall()
        return [
            {
                "plate_number": r["plate_number"],
                "company_id": r["company_id"],
                "latitude": r["latitude"],
                "longitude": r["longitude"],
                "speed_kmh": r["speed_kmh"],
                "heading": r["heading"],
            }
            for r in rows
        ]
    finally:
        db.close()


@app.post("/api/companies/{company_id}/fleet")
async def add_fleet_vehicle(company_id: int, req: FleetAddRequest, user: dict = Depends(get_current_user)):
    """Add a new bus to the company fleet."""
    require_company(user, company_id)
    if req.capacity <= 0:
        raise HTTPException(400, "Capacity must be a positive number")
    db = get_db()
    try:
        # Check plate uniqueness
        exists = db.execute(
            "SELECT id FROM buses WHERE plate_number = ?", (req.plate_number,)
        ).fetchone()
        if exists:
            raise HTTPException(409, "Plate number already registered")
        amenities = json.dumps({"ac": True})
        cur = db.execute(
            """INSERT INTO buses (company_id, plate_number, model, capacity, amenities, entry_code)
               VALUES (?, ?, ?, ?, ?, '1234')""",
            (company_id, req.plate_number, req.model, req.capacity, amenities),
        )
        db.commit()
        return {
            "bus_id": cur.lastrowid,
            "plate_number": req.plate_number,
            "model": req.model,
            "capacity": req.capacity,
        }
    finally:
        db.close()


@app.get("/api/companies/{company_id}/liabilities")
async def get_liabilities(company_id: int, user: dict = Depends(get_current_user)):
    """Get all liabilities for a company."""
    require_company(user, company_id)
    db = get_db()
    try:
        rows = db.execute(
            """SELECT id as liability_id, description, cost_rwf, category, recorded_at
               FROM liabilities WHERE company_id = ?
               ORDER BY recorded_at DESC""",
            (company_id,),
        ).fetchall()
        return [
            {
                "liability_id": r["liability_id"],
                "description": r["description"],
                "cost_rwf": r["cost_rwf"],
                "category": r["category"],
                "recorded_at": r["recorded_at"],
            }
            for r in rows
        ]
    finally:
        db.close()


@app.post("/api/companies/{company_id}/liabilities")
async def add_liability(company_id: int, req: LiabilityAddRequest, user: dict = Depends(get_current_user)):
    """Add a liability record."""
    require_company(user, company_id)
    if req.cost_rwf < 0:
        raise HTTPException(400, "Cost cannot be negative")
    db = get_db()
    try:
        now = datetime.utcnow().isoformat()
        cur = db.execute(
            "INSERT INTO liabilities (company_id, description, cost_rwf, category, recorded_at) VALUES (?, ?, ?, ?, ?)",
            (company_id, req.description, req.cost_rwf, req.category, now),
        )
        db.commit()
        return {"liability_id": cur.lastrowid}
    finally:
        db.close()


# ─── ROUTE SEARCH (kept for backward compat) ────────────────────────────────
@app.get("/api/routes/search")
async def search_routes(
    origin: Optional[str] = Query(None),
    destination: Optional[str] = Query(None),
):
    """Search routes by origin/destination name."""
    db = get_db()
    try:
        query = "SELECT * FROM routes WHERE is_active = 1"
        params = []
        if origin:
            query += " AND origin = ?"
            params.append(origin)
        if destination:
            query += " AND destination = ?"
            params.append(destination)
        rows = db.execute(query, params).fetchall()
        return [dict(r) for r in rows]
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


# ─── STATIC FILE MOUNTS ─────────────────────────────────────────────────────
# Mount AFTER all API routes so /api/* takes precedence
client_dir = os.path.join(STATIC_DIR, "client")
driver_dir = os.path.join(STATIC_DIR, "driver")
company_dir = os.path.join(STATIC_DIR, "company")

if os.path.isdir(client_dir):
    app.mount("/client", StaticFiles(directory=client_dir, html=True), name="client")
if os.path.isdir(driver_dir):
    app.mount("/driver", StaticFiles(directory=driver_dir, html=True), name="driver")
if os.path.isdir(company_dir):
    app.mount("/company", StaticFiles(directory=company_dir, html=True), name="company")


# ─── Root redirect ─────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return HTMLResponse("""<html><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">
    <h1 style="color:#38bdf8">🚌 Kigali Connect</h1>
    <p>Rwanda Bus Ticket Ecosystem</p>
    <div style="margin-top:2rem;display:flex;gap:1rem">
        <a href="/client" style="color:#38bdf8;text-decoration:none;padding:0.5rem 1rem;border:1px solid #38bdf8;border-radius:8px">👤 Client App</a>
        <a href="/driver" style="color:#38bdf8;text-decoration:none;padding:0.5rem 1rem;border:1px solid #38bdf8;border-radius:8px">🚐 Driver App</a>
        <a href="/company" style="color:#38bdf8;text-decoration:none;padding:0.5rem 1rem;border:1px solid #38bdf8;border-radius:8px">🏢 Company App</a>
    </div>
    <p style="margin-top:2rem;color:#94a3b8;font-size:0.8rem">API: <a href="/api" style="color:#38bdf8">/api</a> | Health: <a href="/api/health" style="color:#38bdf8">/api/health</a></p>
    </body></html>""")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

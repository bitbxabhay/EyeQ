"""
db.py — tiny SQLite persistence layer. No ORM, no auth (by request) — this is
a single-patient demo database that survives restarts (unlike the in-browser
state the original Figma export used).
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "app.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS screenings (
    id              TEXT PRIMARY KEY,
    created_at      TEXT NOT NULL,
    type            TEXT NOT NULL,
    status          TEXT NOT NULL,
    va_od           TEXT,
    va_os           TEXT,
    retinal_grade   INTEGER,
    retinal_label   TEXT,
    retinal_refer   INTEGER,
    overall_score   INTEGER NOT NULL,
    risk_level      TEXT NOT NULL,
    conditions      TEXT NOT NULL,   -- JSON array
    factors         TEXT NOT NULL,   -- JSON array
    summary         TEXT NOT NULL,
    recommendation  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
    id           TEXT PRIMARY KEY,
    place_id     TEXT,
    doctor_name  TEXT NOT NULL,
    clinic       TEXT NOT NULL,
    location     TEXT NOT NULL,
    phone        TEXT,
    date         TEXT NOT NULL,
    time         TEXT NOT NULL,
    reason       TEXT NOT NULL,
    created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_cases (
    id            TEXT PRIMARY KEY,
    patient_name  TEXT NOT NULL,
    patient_age   TEXT,
    risk_level    TEXT NOT NULL,
    summary       TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    doctor_name   TEXT NOT NULL,
    clinic        TEXT NOT NULL,
    location      TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    reviewed_at   TEXT,
    review_note   TEXT
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id                      TEXT PRIMARY KEY,
    diabetes_history             TEXT,
    diabetes_duration            TEXT,
    diabetes_duration_value     REAL,
    diabetes_duration_unit      TEXT,
    recent_diabetic_eye_exam    TEXT,
    updated_at                  TEXT NOT NULL
);
"""


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        columns = {row[1] for row in conn.execute("PRAGMA table_info(user_profiles)").fetchall()}
        if "diabetes_duration_value" not in columns:
            conn.execute("ALTER TABLE user_profiles ADD COLUMN diabetes_duration_value REAL")
        if "diabetes_duration_unit" not in columns:
            conn.execute("ALTER TABLE user_profiles ADD COLUMN diabetes_duration_unit TEXT")


# --------------------------------------------------------------- screenings

def insert_screening(rec: dict) -> dict:
    rec = {**rec, "id": new_id("s"), "created_at": now_iso()}
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO screenings
               (id, created_at, type, status, va_od, va_os, retinal_grade,
                retinal_label, retinal_refer, overall_score, risk_level,
                conditions, factors, summary, recommendation)
               VALUES (:id, :created_at, :type, :status, :va_od, :va_os,
                       :retinal_grade, :retinal_label, :retinal_refer,
                       :overall_score, :risk_level, :conditions, :factors,
                       :summary, :recommendation)""",
            {
                **rec,
                "conditions": json.dumps(rec["conditions"]),
                "factors": json.dumps(rec["factors"]),
            },
        )
    return get_screening(rec["id"])


def list_screenings() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM screenings ORDER BY created_at DESC"
        ).fetchall()
    return [_screening_row(r) for r in rows]


def get_screening(sid: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM screenings WHERE id = ?", (sid,)).fetchone()
    return _screening_row(row) if row else None


def _screening_row(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["conditions"] = json.loads(d["conditions"])
    d["factors"] = json.loads(d["factors"])
    d["retinal_refer"] = bool(d["retinal_refer"]) if d["retinal_refer"] is not None else None
    return d


# ------------------------------------------------------------- user profile

def get_diabetes_profile(user_id: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT diabetes_history, diabetes_duration, diabetes_duration_value, diabetes_duration_unit, recent_diabetic_eye_exam FROM user_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    return dict(row) if row else None


def upsert_diabetes_profile(user_id: str, profile: dict) -> dict:
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO user_profiles
               (user_id, diabetes_history, diabetes_duration, diabetes_duration_value, diabetes_duration_unit, recent_diabetic_eye_exam, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(user_id) DO UPDATE SET
                 diabetes_history = excluded.diabetes_history,
                 diabetes_duration = excluded.diabetes_duration,
                 diabetes_duration_value = excluded.diabetes_duration_value,
                 diabetes_duration_unit = excluded.diabetes_duration_unit,
                 recent_diabetic_eye_exam = excluded.recent_diabetic_eye_exam,
                 updated_at = excluded.updated_at""",
            (
                user_id,
                profile.get("diabetes_history"),
                profile.get("diabetes_duration"),
                profile.get("diabetes_duration_value"),
                profile.get("diabetes_duration_unit"),
                profile.get("recent_diabetic_eye_exam"),
                now_iso(),
            ),
        )
    return get_diabetes_profile(user_id) or profile


# ------------------------------------------------------------- appointments

def insert_appointment(rec: dict) -> dict:
    rec = {**rec, "id": new_id("a"), "created_at": now_iso()}
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO appointments
               (id, place_id, doctor_name, clinic, location, phone, date, time, reason, created_at)
               VALUES (:id, :place_id, :doctor_name, :clinic, :location, :phone, :date, :time, :reason, :created_at)""",
            rec,
        )
    return rec


def list_appointments() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM appointments ORDER BY date, time"
        ).fetchall()
    return [dict(r) for r in rows]


def is_slot_taken(place_id: str | None, date: str, time: str) -> bool:
    if not place_id:
        return False
    with get_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM appointments WHERE place_id = ? AND date = ? AND time = ?",
            (place_id, date, time),
        ).fetchone()
    return row is not None


# -------------------------------------------------------- referral review

def insert_referral_case(rec: dict) -> dict:
    rec = {**rec, "id": new_id("r"), "created_at": now_iso(), "status": rec.get("status", "pending")}
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO referral_cases
               (id, patient_name, patient_age, risk_level, summary, recommendation, status,
                doctor_name, clinic, location, created_at, reviewed_at, review_note)
               VALUES (:id, :patient_name, :patient_age, :risk_level, :summary, :recommendation,
                       :status, :doctor_name, :clinic, :location, :created_at, :reviewed_at, :review_note)""",
            rec,
        )
    return rec


def list_referral_cases() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM referral_cases ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def update_referral_case(rid: str, status: str, review_note: str | None = None) -> dict | None:
    timestamp = now_iso()
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM referral_cases WHERE id = ?",
            (rid,),
        ).fetchone()
        if row is None:
            return None
        conn.execute(
            "UPDATE referral_cases SET status = ?, reviewed_at = ?, review_note = ? WHERE id = ?",
            (status, timestamp, review_note, rid),
        )
    return get_referral_case(rid)


def get_referral_case(rid: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM referral_cases WHERE id = ?", (rid,)).fetchone()
    return dict(row) if row else None


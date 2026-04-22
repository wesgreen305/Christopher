from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from datetime import datetime, timedelta
import random, math

router = APIRouter()

class SensorReading(BaseModel):
    sensor_id: str
    sensor_type: str
    value: float
    unit: str
    zone: str = "main"

SENSOR_UNITS = {
    "temperature": "°C",
    "ph": "pH",
    "dissolved_oxygen": "mg/L",
    "ammonia": "mg/L",
    "nitrite": "mg/L",
    "nitrate": "mg/L",
    "tds": "ppm",
    "water_level": "cm",
}

@router.post("/reading")
def post_reading(reading: SensorReading):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO sensor_readings (sensor_id, sensor_type, value, unit, zone) VALUES (?,?,?,?,?)",
        (reading.sensor_id, reading.sensor_type, reading.value, reading.unit, reading.zone)
    )
    conn.commit()
    conn.close()
    return {"status": "ok"}

@router.get("/latest")
def get_latest():
    """Get the most recent reading for each sensor type per zone."""
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT sensor_type, zone, value, unit, timestamp
        FROM sensor_readings
        WHERE id IN (
            SELECT MAX(id) FROM sensor_readings GROUP BY sensor_type, zone
        )
        ORDER BY sensor_type, zone
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@router.get("/history")
def get_history(
    sensor_type: str,
    zone: str = "fish_tank",
    hours: int = Query(default=24, ge=1, le=720)
):
    conn = get_db()
    c = conn.cursor()
    since = datetime.utcnow() - timedelta(hours=hours)
    c.execute("""
        SELECT value, unit, timestamp FROM sensor_readings
        WHERE sensor_type=? AND zone=? AND timestamp >= ?
        ORDER BY timestamp ASC
    """, (sensor_type, zone, since.isoformat()))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@router.post("/mock/generate")
def generate_mock_data():
    """Seed the DB with realistic mock sensor data for the last 48 hours."""
    conn = get_db()
    c = conn.cursor()

    now = datetime.utcnow()
    entries = []

    sensor_profiles = [
        # (sensor_id, sensor_type, zone, base, amplitude, noise, unit)
        ("esp32_tank_01", "temperature",      "fish_tank", 24.0, 1.5, 0.2, "°C"),
        ("esp32_tank_01", "ph",               "fish_tank",  7.1, 0.3, 0.05,"pH"),
        ("esp32_tank_01", "dissolved_oxygen", "fish_tank",  7.5, 0.8, 0.1, "mg/L"),
        ("esp32_tank_01", "ammonia",          "fish_tank",  0.2, 0.1, 0.02,"mg/L"),
        ("esp32_tank_01", "nitrite",          "fish_tank",  0.1, 0.05,0.01,"mg/L"),
        ("esp32_tank_01", "nitrate",          "fish_tank", 20.0, 3.0, 0.5, "mg/L"),
        ("esp32_grow_01", "temperature",      "grow_bed",  22.0, 2.0, 0.3, "°C"),
        ("esp32_grow_01", "tds",              "grow_bed", 800.0,50.0, 5.0, "ppm"),
        ("esp32_grow_01", "water_level",      "grow_bed",  35.0, 5.0, 0.5, "cm"),
    ]

    # Generate a reading every 15 min for 48 hours = 192 points per sensor
    for minutes_ago in range(48*60, -1, -15):
        ts = now - timedelta(minutes=minutes_ago)
        t = minutes_ago / 60.0  # hours ago
        for sid, stype, zone, base, amp, noise, unit in sensor_profiles:
            wave = math.sin(t * math.pi / 12)  # 24h cycle
            val = base + amp * wave + random.gauss(0, noise)
            val = round(max(0, val), 3)
            entries.append((sid, stype, val, unit, zone, ts.isoformat()))

    c.executemany(
        "INSERT INTO sensor_readings (sensor_id, sensor_type, value, unit, zone, timestamp) VALUES (?,?,?,?,?,?)",
        entries
    )
    conn.commit()
    conn.close()
    return {"status": "ok", "inserted": len(entries)}
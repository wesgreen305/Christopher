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
    conn = get_db()
    c = conn.cursor()

    # Find every unique sensor_type + zone combination that exists in the DB
    c.execute("""
        SELECT DISTINCT sensor_type, zone, unit
        FROM sensor_readings
        ORDER BY zone, sensor_type
    """)
    existing = c.fetchall()

    # Sensible base values per sensor type for realistic wave generation
    SENSOR_DEFAULTS = {
        'temperature':      (24.0, 1.5,  0.2),
        'ph':               (7.1,  0.3,  0.05),
        'dissolved_oxygen': (7.5,  0.8,  0.1),
        'ammonia':          (0.2,  0.1,  0.02),
        'nitrite':          (0.1,  0.05, 0.01),
        'nitrate':          (20.0, 3.0,  0.5),
        'tds':              (800.0,50.0, 5.0),
        'water_level':      (35.0, 5.0,  0.5),
    }

    now = datetime.utcnow()
    entries = []

    for row in existing:
        stype = row['sensor_type']
        zone  = row['zone']
        unit  = row['unit']
        sensor_id = f"esp32_{zone.replace(' ', '_').lower()}_01"

        base, amp, noise = SENSOR_DEFAULTS.get(stype, (10.0, 1.0, 0.1))

        for minutes_ago in range(48 * 60, -1, -15):
            ts = now - timedelta(minutes=minutes_ago)
            t  = minutes_ago / 60.0
            wave = math.sin(t * math.pi / 12)
            val  = base + amp * wave + random.gauss(0, noise)
            val  = round(max(0, val), 3)
            entries.append((sensor_id, stype, val, unit, zone, ts.isoformat()))

    if not entries:
        conn.close()
        return {"status": "no_sensors", "message": "No sensors found. Add sensors first."}

    c.executemany(
        "INSERT INTO sensor_readings (sensor_id, sensor_type, value, unit, zone, timestamp) VALUES (?,?,?,?,?,?)",
        entries
    )
    conn.commit()
    conn.close()
    return {"status": "ok", "sensors_seeded": len(existing), "inserted": len(entries)}

@router.delete("/delete")
def delete_sensor(sensor_type: str, zone: str):
    conn = get_db()
    c = conn.cursor()

    # Delete all sensor readings
    c.execute(
        "DELETE FROM sensor_readings WHERE sensor_type=? AND zone=?",
        (sensor_type, zone)
    )

    # Delete any alert rules watching this sensor+zone combo
    c.execute(
        "DELETE FROM alert_rules WHERE sensor_type=? AND zone=?",
        (sensor_type, zone)
    )

    # Delete any alert history for this sensor type
    c.execute(
        "DELETE FROM alert_history WHERE sensor_type=?",
        (sensor_type,)
    )

    conn.commit()
    conn.close()
    return {"status": "deleted"}
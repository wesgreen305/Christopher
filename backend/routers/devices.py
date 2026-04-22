from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_db

router = APIRouter()

class DeviceCreate(BaseModel):
    id: str
    name: str
    device_type: str
    zone: str = "main"
    gpio_pin: Optional[int] = None
    notes: Optional[str] = None

class DeviceToggle(BaseModel):
    is_on: bool

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    zone: Optional[str] = None
    gpio_pin: Optional[int] = None
    auto_mode: Optional[bool] = None
    notes: Optional[str] = None

@router.get("/")
def list_devices():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM devices ORDER BY zone, device_type")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@router.post("/")
def create_device(device: DeviceCreate):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute(
            "INSERT INTO devices (id, name, device_type, zone, gpio_pin, notes) VALUES (?,?,?,?,?,?)",
            (device.id, device.name, device.device_type, device.zone, device.gpio_pin, device.notes)
        )
        conn.commit()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()
    return {"status": "created", "id": device.id}

@router.patch("/{device_id}/toggle")
def toggle_device(device_id: str, body: DeviceToggle):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM devices WHERE id=?", (device_id,))
    device = c.fetchone()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    c.execute("UPDATE devices SET is_on=? WHERE id=?", (1 if body.is_on else 0, device_id))
    conn.commit()

    # TODO: Add actual GPIO control here when running on Pi
    # Example:
    # import RPi.GPIO as GPIO
    # GPIO.setmode(GPIO.BCM)
    # GPIO.setup(device['gpio_pin'], GPIO.OUT)
    # GPIO.output(device['gpio_pin'], GPIO.HIGH if body.is_on else GPIO.LOW)

    conn.close()
    return {"status": "ok", "device_id": device_id, "is_on": body.is_on}

@router.patch("/{device_id}")
def update_device(device_id: str, body: DeviceUpdate):
    conn = get_db()
    c = conn.cursor()
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields = ", ".join(f"{k}=?" for k in updates)
    c.execute(f"UPDATE devices SET {fields} WHERE id=?", (*updates.values(), device_id))
    conn.commit()
    conn.close()
    return {"status": "updated"}

@router.delete("/{device_id}")
def delete_device(device_id: str):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM devices WHERE id=?", (device_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_db

router = APIRouter()

class ZoneCreate(BaseModel):
    name: str
    zone_type: str       # fish_tank, grow_bed, sump, greenhouse, reservoir, compost
    volume_liters: Optional[float] = None
    notes: Optional[str] = None
    color: Optional[str] = None
    # Floor plan position and size
    pos_x: Optional[float] = 50
    pos_y: Optional[float] = 50
    width: Optional[float] = 160
    height: Optional[float] = 120

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    zone_type: Optional[str] = None
    volume_liters: Optional[float] = None
    notes: Optional[str] = None
    color: Optional[str] = None
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None

@router.get("/")
def list_zones():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM zones ORDER BY created_at")
    zones = [dict(r) for r in c.fetchall()]

    # Attach latest sensor readings and device count per zone
    for zone in zones:
        c.execute("""
            SELECT sensor_type, value, unit, timestamp
            FROM sensor_readings
            WHERE zone=? AND id IN (
                SELECT MAX(id) FROM sensor_readings WHERE zone=? GROUP BY sensor_type
            )
        """, (zone['name'], zone['name']))
        zone['sensors'] = [dict(r) for r in c.fetchall()]

        c.execute("SELECT COUNT(*) as count FROM devices WHERE zone=?", (zone['name'],))
        zone['device_count'] = c.fetchone()['count']

        c.execute("SELECT COUNT(*) as count FROM devices WHERE zone=? AND is_on=1", (zone['name'],))
        zone['devices_on'] = c.fetchone()['count']

    conn.close()
    return zones

@router.post("/")
def create_zone(zone: ZoneCreate):
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO zones (name, zone_type, volume_liters, notes, color, pos_x, pos_y, width, height)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (zone.name, zone.zone_type, zone.volume_liters, zone.notes,
              zone.color, zone.pos_x, zone.pos_y, zone.width, zone.height))
        conn.commit()
        zone_id = c.lastrowid
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()
    return {"status": "created", "id": zone_id}

@router.patch("/{zone_id}")
def update_zone(zone_id: int, body: ZoneUpdate):
    conn = get_db()
    c = conn.cursor()
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields = ", ".join(f"{k}=?" for k in updates)
    c.execute(f"UPDATE zones SET {fields} WHERE id=?", (*updates.values(), zone_id))
    conn.commit()
    conn.close()
    return {"status": "updated"}

@router.delete("/{zone_id}")
def delete_zone(zone_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM zones WHERE id=?", (zone_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@router.get("/{zone_id}/devices")
def get_zone_devices(zone_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT name FROM zones WHERE id=?", (zone_id,))
    zone = c.fetchone()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    c.execute("SELECT * FROM devices WHERE zone=?", (zone['name'],))
    devices = [dict(r) for r in c.fetchall()]
    conn.close()
    return devices
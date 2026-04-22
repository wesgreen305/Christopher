from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_db

router = APIRouter()

class ScheduleCreate(BaseModel):
    name: str
    device_id: str
    action: str           # "on" or "off"
    time_on: Optional[str] = None   # "06:00"
    time_off: Optional[str] = None  # "22:00"
    days_of_week: Optional[str] = "mon,tue,wed,thu,fri,sat,sun"
    cron_expr: Optional[str] = None
    is_active: bool = True

class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    time_on: Optional[str] = None
    time_off: Optional[str] = None
    days_of_week: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/")
def list_schedules():
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT s.*, d.name as device_name, d.device_type
        FROM schedules s
        LEFT JOIN devices d ON s.device_id = d.id
        ORDER BY s.device_id, s.time_on
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@router.post("/")
def create_schedule(schedule: ScheduleCreate):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        """INSERT INTO schedules
           (name, device_id, action, time_on, time_off, days_of_week, cron_expr, is_active)
           VALUES (?,?,?,?,?,?,?,?)""",
        (schedule.name, schedule.device_id, schedule.action,
         schedule.time_on, schedule.time_off, schedule.days_of_week,
         schedule.cron_expr, 1 if schedule.is_active else 0)
    )
    conn.commit()
    schedule_id = c.lastrowid
    conn.close()
    return {"status": "created", "id": schedule_id}

@router.patch("/{schedule_id}")
def update_schedule(schedule_id: int, body: ScheduleUpdate):
    conn = get_db()
    c = conn.cursor()
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields = ", ".join(f"{k}=?" for k in updates)
    c.execute(f"UPDATE schedules SET {fields} WHERE id=?", (*updates.values(), schedule_id))
    conn.commit()
    conn.close()
    return {"status": "updated"}

@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM schedules WHERE id=?", (schedule_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@router.delete("/by-device/{device_id}")
def delete_schedules_by_device(device_id: str):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM schedules WHERE device_id=?", (device_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted", "rows": c.rowcount}
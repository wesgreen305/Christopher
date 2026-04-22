from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_db

router = APIRouter()

class AlertRule(BaseModel):
    name: str
    sensor_type: str
    zone: str = "fish_tank"
    condition: str   # "above" or "below"
    threshold: float
    message: Optional[str] = None
    is_active: bool = True

@router.get("/rules")
def list_rules():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM alert_rules ORDER BY sensor_type")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@router.post("/rules")
def create_rule(rule: AlertRule):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO alert_rules (name, sensor_type, zone, condition, threshold, message, is_active) VALUES (?,?,?,?,?,?,?)",
        (rule.name, rule.sensor_type, rule.zone, rule.condition, rule.threshold, rule.message, 1 if rule.is_active else 0)
    )
    conn.commit()
    rule_id = c.lastrowid
    conn.close()
    return {"status": "created", "id": rule_id}

@router.delete("/rules/{rule_id}")
def delete_rule(rule_id: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM alert_rules WHERE id=?", (rule_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

@router.get("/history")
def get_alert_history(limit: int = 50):
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT * FROM alert_history
        ORDER BY triggered_at DESC
        LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@router.post("/check")
def check_alerts():
    """Run alert checks against latest sensor readings. Call this on a cron or after each reading."""
    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT * FROM alert_rules WHERE is_active=1")
    rules = [dict(r) for r in c.fetchall()]

    triggered = []
    for rule in rules:
        c.execute("""
            SELECT value FROM sensor_readings
            WHERE sensor_type=? AND zone=?
            ORDER BY timestamp DESC LIMIT 1
        """, (rule["sensor_type"], rule["zone"]))
        row = c.fetchone()
        if not row:
            continue
        value = row["value"]
        fired = (rule["condition"] == "above" and value > rule["threshold"]) or \
                (rule["condition"] == "below" and value < rule["threshold"])
        if fired:
            msg = rule["message"] or f"{rule['sensor_type']} is {rule['condition']} {rule['threshold']}"
            c.execute(
                "INSERT INTO alert_history (rule_id, sensor_type, value, message) VALUES (?,?,?,?)",
                (rule["id"], rule["sensor_type"], value, msg)
            )
            triggered.append({"rule": rule["name"], "value": value, "message": msg})

    conn.commit()
    conn.close()
    return {"triggered": len(triggered), "alerts": triggered}
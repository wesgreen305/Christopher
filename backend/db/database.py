import sqlite3
import os

DB_PATH = os.environ.get("DB_PATH", "./aquaponics.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()

    # Zones - physical areas in the system
    c.execute("""
        CREATE TABLE IF NOT EXISTS zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            zone_type TEXT NOT NULL,     -- fish_tank, grow_bed, sump, greenhouse, reservoir, compost
            volume_liters REAL,
            notes TEXT,
            color TEXT,
            pos_x REAL DEFAULT 50,       -- floor plan x position (px)
            pos_y REAL DEFAULT 50,       -- floor plan y position (px)
            width REAL DEFAULT 160,      -- floor plan width (px)
            height REAL DEFAULT 120,     -- floor plan height (px)
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Sensor readings - time series log
    c.execute("""
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_id TEXT NOT NULL,
            sensor_type TEXT NOT NULL,  -- temperature, ph, dissolved_oxygen, ammonia, nitrite, nitrate, water_level, tds
            value REAL NOT NULL,
            unit TEXT NOT NULL,
            zone TEXT DEFAULT 'main',   -- fish_tank, grow_bed, sump, etc.
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Device registry
    c.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            device_type TEXT NOT NULL,  -- pump, light, heater, fan, valve
            zone TEXT DEFAULT 'main',
            gpio_pin INTEGER,           -- Pi GPIO pin if directly wired
            is_on INTEGER DEFAULT 0,    -- 0/1 boolean
            auto_mode INTEGER DEFAULT 0,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Schedules / automation rules
    c.execute("""
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            device_id TEXT NOT NULL,
            action TEXT NOT NULL,       -- on / off
            cron_expr TEXT,             -- e.g. "0 6 * * *" for 6am daily
            time_on TEXT,               -- simple HH:MM if not using cron
            time_off TEXT,
            days_of_week TEXT,          -- comma-separated: "mon,tue,wed"
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (device_id) REFERENCES devices(id)
        )
    """)

    # Alert rules
    c.execute("""
        CREATE TABLE IF NOT EXISTS alert_rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sensor_type TEXT NOT NULL,
            zone TEXT DEFAULT 'main',
            condition TEXT NOT NULL,    -- above / below
            threshold REAL NOT NULL,
            message TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Alert history
    c.execute("""
        CREATE TABLE IF NOT EXISTS alert_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_id INTEGER,
            sensor_type TEXT NOT NULL,
            value REAL NOT NULL,
            message TEXT,
            resolved INTEGER DEFAULT 0,
            triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
        )
    """)

    # Seed default devices
    c.execute("SELECT COUNT(*) FROM devices")
    if c.fetchone()[0] == 0:
        devices = [
            ("pump_main",    "Main Water Pump",    "pump",   "fish_tank", None, 0, 0, "Primary circulation pump"),
            ("pump_sump",    "Sump Pump",          "pump",   "sump",      None, 0, 0, "Sump return pump"),
            ("light_grow_1", "Grow Light Zone A",  "light",  "grow_bed",  None, 0, 0, "LED grow light bank 1"),
            ("light_grow_2", "Grow Light Zone B",  "light",  "grow_bed",  None, 0, 0, "LED grow light bank 2"),
            ("heater_tank",  "Tank Heater",        "heater", "fish_tank", None, 0, 1, "Aquatic heater"),
            ("fan_vent",     "Ventilation Fan",    "fan",    "greenhouse",None, 0, 0, "Exhaust fan"),
        ]
        c.executemany(
            "INSERT INTO devices (id, name, device_type, zone, gpio_pin, is_on, auto_mode, notes) VALUES (?,?,?,?,?,?,?,?)",
            devices
        )

    # Seed default alert rules
    c.execute("SELECT COUNT(*) FROM alert_rules")
    if c.fetchone()[0] == 0:
        rules = [
            ("pH Too Low",        "ph",          "fish_tank", "below", 6.5, "pH dropped below safe range"),
            ("pH Too High",       "ph",          "fish_tank", "above", 8.0, "pH exceeded safe range"),
            ("Temp Too Low",      "temperature", "fish_tank", "below", 18.0,"Water temperature critically low"),
            ("Temp Too High",     "temperature", "fish_tank", "above", 30.0,"Water temperature critically high"),
            ("Low Dissolved O2",  "dissolved_oxygen","fish_tank","below",5.0,"Dissolved oxygen dangerously low"),
            ("High Ammonia",      "ammonia",     "fish_tank", "above", 0.5, "Ammonia spike detected"),
        ]
        c.executemany(
            "INSERT INTO alert_rules (name, sensor_type, zone, condition, threshold, message) VALUES (?,?,?,?,?,?)",
            rules
        )

    # Seed default zones
    c.execute("SELECT COUNT(*) FROM zones")
    if c.fetchone()[0] == 0:
        zones = [
            ("fish_tank",   "fish_tank",   200.0, "Main fish tank",          "#3b82f6", 40,  40,  200, 150),
            ("grow_bed",    "grow_bed",    80.0,  "Main grow bed",           "#22c55e", 280, 40,  200, 150),
            ("sump",        "sump",        100.0, "Sump / filter chamber",   "#8b5cf6", 40,  230, 140, 100),
            ("greenhouse",  "greenhouse",  None,  "Main greenhouse enclosure","#f59e0b", 20,  20,  460, 340),
        ]
        c.executemany(
            "INSERT INTO zones (name, zone_type, volume_liters, notes, color, pos_x, pos_y, width, height) VALUES (?,?,?,?,?,?,?,?,?)",
            zones
        )

    conn.commit()
    conn.close()
    print("✅ Database initialized")
# ChristopherOS

A full-stack greenhouse & aquaponics management system. Monitor water quality, control devices, and automate your system from any browser on your local network.

---

## Next to do:
FRONTEND
- Modify Dashboard to show Zones with sensors and devices inside
- Update Schedules page to provide different views of the schedules
- Update Zones page to have a List tab to accompany the map tab
- Settings page has some styling issues (toggle buttons) and I want to add a "reset database" or something so I can start from scratch without having to manipulate files
BACKEND
- Claude was helping fix Zones page issues. Get back on that after 4:10pm
- Ensure that backend is updating correctly (ie. all pages show current zones, unassigned devises/sensors show as unassigned, reasign option only allows reassign to current active zones, when someothing is deleted in one place, it is updated on all other pages as well)

## Features

- **Real-time sensor dashboard** — temperature, pH, dissolved oxygen, ammonia, nitrite, nitrate, TDS, water level
- **Device control** — toggle pumps, grow lights, heaters, fans via the UI (or GPIO on Pi)
- **Scheduler** — automate devices on/off by time and day of week
- **Alerts** — threshold-based alerts with history log
- **ESP32 sensor nodes** — WiFi-connected sensor nodes report over HTTP
- **Mock data generator** — develop and test the UI without real hardware

---

## Stack

| Layer     | Tech                        |
|-----------|-----------------------------|
| Frontend  | React 18 + Vite             |
| Backend   | Python FastAPI + Uvicorn    |
| Database  | SQLite (local file)         |
| Charts    | Recharts                    |
| Hardware  | ESP32, Arduino, Raspberry Pi GPIO |

---

## Quick Start

### 1. Backend

```bash
cd C:\Projects\Christopher\backend
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API will be available at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### 2. Frontend

```bash
cd C:\Projects\Christopher\frontend
npm run dev
```

Dashboard at `http://localhost:5173`
On your local network: `http://<pi-ip>:5173`

### 3. Seed Mock Data

On first load, click **"Seed Mock Data"** on the dashboard. This generates 48 hours of realistic sensor data so you can explore the UI immediately.

---

### GIT UPDATE SHORTCUT \NOT PRODUCTION SAFE, USE BRANCHES IN FUTURE\

git add -A && git commit -m "update" && git push

---

## Raspberry Pi Setup

### Auto-start on boot (systemd)

Create `/etc/systemd/system/christopher-backend.service`:

```ini
[Unit]
Description=ChristopherOS Backend
After=network.target

[Service]
WorkingDirectory=/home/pi/christopher/backend
ExecStart=/home/pi/christopher/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable christopher-backend
sudo systemctl start christopher-backend
```

### GPIO Device Control

In `backend/routers/devices.py`, find the `toggle_device` function. Uncomment the GPIO section and set your pin numbers in the Devices UI:

```python
import RPi.GPIO as GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(device['gpio_pin'], GPIO.OUT)
GPIO.output(device['gpio_pin'], GPIO.HIGH if body.is_on else GPIO.LOW)
```

### Relay Wiring (for pumps/lights/heaters)

```
Pi GPIO pin → Relay IN
Pi 5V       → Relay VCC
Pi GND      → Relay GND
Relay COM   → Device power wire
Relay NO    → Device power wire
```

---

## ESP32 Sensor Node

See `esp32_sensor_node/sensor_node.ino`.

1. Install Arduino IDE + ESP32 board support
2. Install libraries: ArduinoJson, OneWire, DallasTemperature
3. Edit `WIFI_SSID`, `WIFI_PASSWORD`, and `API_BASE` (your Pi's IP)
4. Flash to ESP32 and it will POST readings every 60 seconds

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sensors/latest` | Latest reading per sensor/zone |
| GET | `/api/sensors/history?sensor_type=ph&zone=fish_tank&hours=24` | Historical data |
| POST | `/api/sensors/reading` | Ingest a sensor reading |
| POST | `/api/sensors/mock/generate` | Seed 48h of mock data |
| GET | `/api/devices/` | List all devices |
| PATCH | `/api/devices/{id}/toggle` | Turn device on/off |
| GET | `/api/schedules/` | List schedules |
| POST | `/api/schedules/` | Create schedule |
| GET | `/api/alerts/rules` | List alert rules |
| POST | `/api/alerts/check` | Run alert check |
| GET | `/api/alerts/history` | Alert history |

Full interactive docs: `http://localhost:8000/docs`

---

## Project Structure

```
Christopher/
├── README.md                        # Project documentation, setup guide, API reference
├── backend/
│   ├── main.py                      # FastAPI app entry point, CORS, router registration
│   ├── requirements.txt             # Python dependencies (FastAPI, uvicorn, pydantic)
│   ├── start.sh                     # Shell script to create venv, install deps, start server
│   ├── christopher.db               # SQLite database file — auto-generated on first run, stores all sensor readings, devices, schedules and alerts
│   ├── db/
│   │   ├── __init__.py              # Python package marker (empty)
│   │   └── database.py              # SQLite connection, schema creation, seed data
│   ├── routers/
│   │   ├── __init__.py              # Python package marker (empty)
│   │   ├── alerts.py                # Threshold alert rules, alert checking, alert history
│   │   ├── devices.py               # Device registry, toggle on/off, GPIO control hooks
│   │   ├── schedules.py             # Automation rules — time-based on/off scheduling
│   │   ├── sensors.py               # Sensor ingestion, latest readings, history, mock data generator
│   │   └── zones.py                 # 
│   └── models/
│       └── __init__.py              # Python package marker (empty) — Pydantic models can be added here as the project grows
├── frontend/
│   ├── index.html                   # HTML entry point, loads Google Fonts and React app
│   ├── package.json                 # Node dependencies (React, Vite, Recharts, Lucide)
│   ├── vite.config.js               # Vite config — dev server on port 5173, proxies /api to backend
│   ├── start.sh                     # Shell script to install node_modules and start Vite dev server
│   └── src/
│       ├── main.jsx                 # React entry point, mounts app to DOM
│       ├── App.jsx                  # App shell — sidebar navigation, routing, API health check
│       ├── App.css                  # Global layout, sidebar, cards, buttons, toggles, tables
│       ├── index.css                # Design system — CSS variables, fonts, colors, animations
│       ├── api.js                   # All fetch calls to the backend API in one place
│       └── pages/
│       │   ├── Alerts.jsx           # Alert rule management and triggered alert history log
│       │   ├── Alerts.css           # Alert rule styles, condition tags, severity indicators
│       │   ├── Dashboard.jsx        # Live sensor cards, status colors, line charts with safe ranges
│       │   ├── Dashboard.css        # Sensor card styles, chart tabs, time range buttons
│       │   ├── Devices.jsx          # Device grid, on/off toggles, zone filtering, add device modal
│       │   ├── Devices.css          # Device card styles, status indicators, modal overlay
│       │   ├── Scheduler.jsx        # Automation rules — day picker, time inputs, rules table
│       │   ├── Scheduler.css        # Day picker buttons, time range display, schedule table styles
│       │   ├── Settings.jsx         # 
│       │   └── Settings.css         #
│       └── assets/
└── esp32_sensor_node/
    └── sensor_node.ino             # Arduino sketch — reads temp/pH/DO sensors and POSTs to API over WiFi
```

---

## Next Steps (Sprint 2)

- [ ] Cron-based scheduler runner (APScheduler)
- [ ] MQTT broker integration (Mosquitto) for real-time sensor push
- [ ] Email/SMS alerts (Twilio / SMTP)
- [ ] Plant growth tracking (species, planting dates, harvest log)
- [ ] Water change log and maintenance history
- [ ] Mobile-responsive layout improvements
- [ ] Multi-system support (multiple tanks/beds)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import sensors, devices, schedules, alerts, zones
from db.database import init_db

app = FastAPI(title="ChristopherOS", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_db()

app.include_router(sensors.router, prefix="/api/sensors", tags=["sensors"])
app.include_router(devices.router, prefix="/api/devices", tags=["devices"])
app.include_router(schedules.router, prefix="/api/schedules", tags=["schedules"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(zones.router, prefix="/api/zones", tags=["zones"])

@app.get("/api/health")
def health():
    return {"status": "online", "app": "ChristopherOS"}
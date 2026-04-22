const BASE = '/api'

export async function fetchLatestSensors() {
  const r = await fetch(`${BASE}/sensors/latest`)
  return r.json()
}

export async function fetchSensorHistory(sensor_type, zone = 'fish_tank', hours = 24) {
  const r = await fetch(`${BASE}/sensors/history?sensor_type=${sensor_type}&zone=${zone}&hours=${hours}`)
  return r.json()
}

export async function generateMockData() {
  const r = await fetch(`${BASE}/sensors/mock/generate`, { method: 'POST' })
  return r.json()
}

export async function createSensorReading(data) {
  const r = await fetch('/api/sensors/reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return r.json()
}

export async function fetchDevices() {
  const r = await fetch(`${BASE}/devices/`)
  return r.json()
}

export async function toggleDevice(id, is_on) {
  const r = await fetch(`${BASE}/devices/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_on })
  })
  return r.json()
}

export async function fetchSchedules() {
  const r = await fetch(`${BASE}/schedules/`)
  return r.json()
}

export async function createSchedule(data) {
  const r = await fetch(`${BASE}/schedules/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return r.json()
}

export async function deleteSchedule(id) {
  const r = await fetch(`${BASE}/schedules/${id}`, { method: 'DELETE' })
  return r.json()
}

export async function fetchAlertRules() {
  const r = await fetch(`${BASE}/alerts/rules`)
  return r.json()
}

export async function fetchAlertHistory() {
  const r = await fetch(`${BASE}/alerts/history`)
  return r.json()
}

export async function checkAlerts() {
  const r = await fetch(`${BASE}/alerts/check`, { method: 'POST' })
  return r.json()
}
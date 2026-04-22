
import { useState, useEffect } from 'react'
import { fetchLatestSensors, fetchSensorHistory, generateMockData } from '../api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { Thermometer, Droplets, Wind, FlaskConical, RefreshCw, Zap } from 'lucide-react'
import './Dashboard.css'

const SENSOR_META = {
  temperature:      { label: 'Temperature',      unit: '°C',   color: '#f0a830', icon: Thermometer, safe: [18, 28] },
  ph:               { label: 'pH',               unit: 'pH',   color: '#4ab8d8', icon: FlaskConical, safe: [6.5, 8.0] },
  dissolved_oxygen: { label: 'Dissolved O₂',     unit: 'mg/L', color: '#6dcc87', icon: Wind,         safe: [5, 12] },
  ammonia:          { label: 'Ammonia',           unit: 'mg/L', color: '#e05555', icon: Zap,          safe: [0, 0.5] },
  nitrite:          { label: 'Nitrite',           unit: 'mg/L', color: '#9b7fe8', icon: Zap,          safe: [0, 0.3] },
  nitrate:          { label: 'Nitrate',           unit: 'mg/L', color: '#4ab8d8', icon: Zap,          safe: [0, 40]  },
  tds:              { label: 'TDS',               unit: 'ppm',  color: '#6dcc87', icon: Droplets,     safe: [600, 1200] },
  water_level:      { label: 'Water Level',       unit: 'cm',   color: '#4ab8d8', icon: Droplets,     safe: [20, 50] },
}

function statusColor(value, safe) {
  if (!safe || value == null) return 'var(--text-secondary)'
  if (value < safe[0] || value > safe[1]) return 'var(--red)'
  const margin = (safe[1] - safe[0]) * 0.1
  if (value < safe[0] + margin || value > safe[1] - margin) return 'var(--amber)'
  return 'var(--green-bright)'
}

function SensorCard({ type, value, unit, zone, timestamp }) {
  const meta = SENSOR_META[type] || { label: type, unit, color: '#6dcc87', safe: null }
  const Icon = meta.icon || Droplets
  const color = statusColor(value, meta.safe)
  const time = timestamp ? new Date(timestamp + 'Z').toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '--'

  return (
    <div className="card sensor-card" style={{ '--accent': color }}>
      <div className="sensor-card-header">
        <span className="sensor-label">{meta.label}</span>
        <span className="sensor-zone-tag">{zone}</span>
      </div>
      <div className="sensor-value" style={{ color }}>
        {value != null ? value.toFixed(2) : '--'}
        <span className="sensor-unit">{unit || meta.unit}</span>
      </div>
      <div className="sensor-card-footer">
        <Icon size={13} style={{ color: 'var(--text-dim)' }} />
        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          {time}
        </span>
      </div>
    </div>
  )
}

function SensorChart({ sensorType }) {
  const [data, setData] = useState([])
  const [hours, setHours] = useState(24)
  const meta = SENSOR_META[sensorType] || { label: sensorType, color: '#6dcc87', safe: null }

  useEffect(() => {
    fetchSensorHistory(sensorType, 'fish_tank', hours)
      .then(rows => setData(rows.map(r => ({
        t: new Date(r.timestamp + 'Z').toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        v: r.value
      }))))
      .catch(() => {})
  }, [sensorType, hours])

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="chart-header">
        <span className="chart-title">{meta.label} — Fish Tank</span>
        <div className="chart-hours">
          {[6,24,48].map(h => (
            <button key={h} className={`hours-btn ${hours===h?'active':''}`} onClick={() => setHours(h)}>
              {h}h
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-dim)', fontFamily: 'Space Mono' }}
            interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)', fontFamily: 'Space Mono' }} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--text-secondary)' }}
            itemStyle={{ color: meta.color }}
          />
          {meta.safe && <ReferenceLine y={meta.safe[0]} stroke="var(--amber)" strokeDasharray="4 4" strokeWidth={1} />}
          {meta.safe && <ReferenceLine y={meta.safe[1]} stroke="var(--amber)" strokeDasharray="4 4" strokeWidth={1} />}
          <Line type="monotone" dataKey="v" stroke={meta.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function Dashboard() {
  const [readings, setReadings] = useState([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [chartType, setChartType] = useState('temperature')
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = async () => {
    const data = await fetchLatestSensors().catch(() => [])
    setReadings(data)
    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  const seed = async () => {
    setSeeding(true)
    await generateMockData()
    await load()
    setSeeding(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {lastRefresh ? `Last updated ${lastRefresh.toLocaleTimeString()}` : 'Loading...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {readings.length === 0 && (
            <button className="btn btn-primary" onClick={seed} disabled={seeding}>
              <Zap size={14} /> {seeding ? 'Generating...' : 'Seed Mock Data'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 90 }} />
          ))}
        </div>
      ) : readings.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px', marginBottom: 24 }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No sensor data yet.</p>
          <button className="btn btn-primary" onClick={seed} disabled={seeding}>
            <Zap size={14} /> {seeding ? 'Generating...' : 'Generate Mock Data'}
          </button>
        </div>
      ) : (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {readings.map((r, i) => (
            <SensorCard key={i} type={r.sensor_type} value={r.value} unit={r.unit}
              zone={r.zone} timestamp={r.timestamp} />
          ))}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div className="chart-type-tabs">
          {Object.entries(SENSOR_META).map(([key, meta]) => (
            <button key={key}
              className={`chart-tab ${chartType === key ? 'active' : ''}`}
              onClick={() => setChartType(key)}
            >{meta.label}</button>
          ))}
        </div>
      </div>

      <SensorChart sensorType={chartType} />
    </div>
  )
}
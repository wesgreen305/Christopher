import { useState, useEffect } from 'react'
import { fetchLatestSensors, fetchSensorHistory } from '../api'
import { RefreshCw, Thermometer, Droplets, Wind, FlaskConical, Zap, Plus, X, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SENSOR_META = {
  temperature:      { label: 'Temperature',   unit: '°C',   color: '#f0a830', icon: Thermometer },
  ph:               { label: 'pH',            unit: 'pH',   color: '#4ab8d8', icon: FlaskConical },
  dissolved_oxygen: { label: 'Dissolved O₂',  unit: 'mg/L', color: '#6dcc87', icon: Wind },
  ammonia:          { label: 'Ammonia',        unit: 'mg/L', color: '#e05555', icon: Zap },
  nitrite:          { label: 'Nitrite',        unit: 'mg/L', color: '#9b7fe8', icon: Zap },
  nitrate:          { label: 'Nitrate',        unit: 'mg/L', color: '#4ab8d8', icon: Zap },
  tds:              { label: 'TDS',            unit: 'ppm',  color: '#6dcc87', icon: Droplets },
  water_level:      { label: 'Water Level',    unit: 'cm',   color: '#4ab8d8', icon: Droplets },
}

const ZONE_COLORS = {
  fish_tank:   { color: '#3b82f6', bg: '#dbeafe' },
  grow_bed:    { color: '#22c55e', bg: '#dcfce7' },
  sump:        { color: '#8b5cf6', bg: '#ede9fe' },
  greenhouse:  { color: '#f59e0b', bg: '#fef9c3' },
  reservoir:   { color: '#0ea5e9', bg: '#e0f2fe' },
  compost:     { color: '#a16207', bg: '#fef3c7' },
  main:        { color: '#64748b', bg: '#f1f5f9' },
}

const ZONES = ['fish_tank', 'grow_bed', 'sump', 'greenhouse', 'reservoir', 'compost', 'main']

// ── Add Sensor Modal ──────────────────────────────────────────────────────────

function AddSensorModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    sensor_id: '', sensor_type: 'temperature', zone: 'fish_tank', value: '', unit: '°C',
  })
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTypeChange = (type) => {
    setForm(f => ({ ...f, sensor_type: type, unit: SENSOR_META[type]?.unit || '' }))
  }

  const submit = async () => {
    if (!form.sensor_id || !form.value) { setError('Sensor ID and value are required.'); return }
    const r = await fetch('/api/sensors/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, value: parseFloat(form.value) })
    })
    if (r.ok) { onAdd(); onClose() }
    else setError('Failed to save. Check all fields.')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Add Sensor</h2>
        <div className="modal-form">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Sensor ID</label>
              <input className="form-input" placeholder="e.g. esp32_tank_02"
                value={form.sensor_id} onChange={e => set('sensor_id', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Zone</label>
              <select className="form-select" value={form.zone} onChange={e => set('zone', e.target.value)}>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Sensor Type</label>
              <select className="form-select" value={form.sensor_type}
                onChange={e => handleTypeChange(e.target.value)}>
                {Object.entries(SENSOR_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit</label>
              <input className="form-input" value={form.unit}
                onChange={e => set('unit', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Initial Value</label>
            <input className="form-input" type="number" step="0.01" placeholder="e.g. 24.0"
              value={form.value} onChange={e => set('value', e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--red)', fontSize: 12 }}>{error}</p>}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Add Sensor</button>
        </div>
      </div>
    </div>
  )
}

// ── Sensor Detail Panel ───────────────────────────────────────────────────────

function SensorDetailPanel({ sensor, onClose, onDelete, onReassign }) {
  const [newZone, setNewZone] = useState(sensor.zone)
  const [reassigning, setReassigning] = useState(false)
  const meta = SENSOR_META[sensor.sensor_type] || { label: sensor.sensor_type, color: '#6dcc87' }
  const Icon = meta.icon || Droplets

  const handleReassign = async () => {
    if (newZone === sensor.zone) return
    setReassigning(true)
    await fetch('/api/sensors/reassign', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sensor_type: sensor.sensor_type, old_zone: sensor.zone, new_zone: newZone })
    })
    setReassigning(false)
    onReassign()
  }

  const handleDelete = async () => {
    if (!confirm(`Delete all readings for ${meta.label} in ${sensor.zone}? This cannot be undone.`)) return
    await fetch(`/api/sensors/delete?sensor_type=${encodeURIComponent(sensor.sensor_type)}&zone=${encodeURIComponent(sensor.zone)}`, {
      method: 'DELETE'
    })
    onDelete()
  }

  return (
    <div className="zone-detail-panel" style={{ width: 260 }}>
      <div className="zone-detail-header" style={{ borderColor: meta.color }}>
        <div>
          <span className="zone-detail-type" style={{ color: meta.color }}>{meta.label}</span>
          <h2 className="zone-detail-name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon size={15} style={{ color: meta.color }} />
            {sensor.zone}
          </h2>
        </div>
        <button className="zone-detail-close" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="zone-detail-body">
        <div className="zone-detail-stat">
          <span className="zone-detail-stat-label">Current Value</span>
          <span className="zone-detail-stat-value" style={{ color: meta.color, fontSize: 20 }}>
            {sensor.value?.toFixed(3)}
            <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 4 }}>{sensor.unit}</span>
          </span>
        </div>

        <div className="zone-detail-stat">
          <span className="zone-detail-stat-label">Last Updated</span>
          <span className="zone-detail-stat-value" style={{ fontSize: 11 }}>
            {new Date(sensor.timestamp + 'Z').toLocaleString()}
          </span>
        </div>

        <div className="zone-detail-section">
          <h4>Reassign Zone</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="form-select" value={newZone} onChange={e => setNewZone(e.target.value)}>
              {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
            <button className="btn btn-primary" style={{ flexShrink: 0 }}
              onClick={handleReassign} disabled={newZone === sensor.zone || reassigning}>
              {reassigning ? '...' : 'Move'}
            </button>
          </div>
        </div>

        <button className="btn btn-danger" style={{ width: '100%', marginTop: 8 }} onClick={handleDelete}>
          <Trash2 size={13} /> Delete All Readings
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Sensors() {
  const [readings, setReadings] = useState([])
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState(24)
  const [history, setHistory] = useState([])

  const load = async () => {
    const data = await fetchLatestSensors().catch(() => [])
    setReadings(data)
    setLoading(false)
    if (selected) {
      const updated = data.find(r =>
        r.sensor_type === selected.sensor_type && r.zone === selected.zone)
      setSelected(updated || null)
    }
  }

  useEffect(() => { load() }, [])

  // Load chart history whenever selected sensor or hours changes
  useEffect(() => {
    if (!selected) { setHistory([]); return }
    fetchSensorHistory(selected.sensor_type, selected.zone, hours)
      .then(rows => setHistory(rows.map(r => ({
        t: new Date(r.timestamp + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        v: r.value
      }))))
      .catch(() => {})
  }, [selected, hours])

  // Group readings by zone
  const grouped = readings.reduce((acc, r) => {
    if (!acc[r.zone]) acc[r.zone] = []
    acc[r.zone].push(r)
    return acc
  }, {})

  const meta = selected
    ? (SENSOR_META[selected.sensor_type] || { label: selected.sensor_type, color: '#6dcc87', unit: '' })
    : null

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingBottom: 0 }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sensors</h1>
          <p className="page-subtitle">{readings.length} active readings · click a row to inspect</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Sensor</button>
        </div>
      </div>

      {/* Chart — shown when a sensor is selected */}
      {selected && meta && (
        <div className="card" style={{ marginBottom: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: meta.color }}>
              {meta.label} — {selected.zone}
              <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: 12 }}>
                latest: {selected.value?.toFixed(3)} {selected.unit}
              </span>
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {[6, 24, 48].map(h => (
                <button key={h} onClick={() => setHours(h)}
                  className={`hours-btn ${hours === h ? 'active' : ''}`}>
                  {h}h
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={history} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'var(--text-dim)', fontFamily: 'Space Mono' }}
                interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-dim)', fontFamily: 'Space Mono' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                itemStyle={{ color: meta.color }}
              />
              <Line type="monotone" dataKey="v" stroke={meta.color} strokeWidth={2}
                dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table + side panel */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>

        {/* Zone-grouped table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ padding: 20, color: 'var(--text-dim)' }}>Loading...</p>
          ) : (
            <table className="data-table" style={{ borderRadius: 0 }}>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Sensor</th>
                  <th>Value</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([zone, sensors]) => {
                  const zc = ZONE_COLORS[zone] || ZONE_COLORS.main
                  return sensors.map((r, i) => {
                    const m = SENSOR_META[r.sensor_type] || {}
                    const Icon = m.icon || Droplets
                    const isSelected = selected?.sensor_type === r.sensor_type && selected?.zone === r.zone
                    return (
                      <tr key={`${zone}-${r.sensor_type}`}
                        onClick={() => setSelected(isSelected ? null : r)}
                        style={{ cursor: 'pointer',
                          background: isSelected ? 'var(--bg-elevated)' : '' }}>

                        {/* Zone cell — only show on first row of each zone group */}
                        {i === 0 ? (
                          <td rowSpan={sensors.length}
                            style={{ verticalAlign: 'middle', width: 120,
                              borderLeft: `4px solid ${zc.color}`,
                              background: isSelected ? 'var(--bg-elevated)' : zc.bg + '44' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                              color: zc.color, textTransform: 'uppercase', letterSpacing: '0.06em'
                            }}>
                              {zone.replace('_', ' ')}
                            </span>
                          </td>
                        ) : null}

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Icon size={13} style={{ color: m.color || 'var(--text-dim)' }} />
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                              {m.label || r.sensor_type}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700,
                            color: m.color || 'var(--text-primary)' }}>
                            {r.value?.toFixed(3)}
                            <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: 4 }}>
                              {r.unit}
                            </span>
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                          {new Date(r.timestamp + 'Z').toLocaleTimeString()}
                        </td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Side panel */}
        {selected && (
          <SensorDetailPanel
            sensor={selected}
            onClose={() => setSelected(null)}
            onDelete={() => { setSelected(null); load() }}
            onReassign={() => { setSelected(null); load() }}
          />
        )}
      </div>

      {showAdd && <AddSensorModal onClose={() => setShowAdd(false)} onAdd={load} />}
    </div>
  )
}
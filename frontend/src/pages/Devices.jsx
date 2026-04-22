import { useState, useEffect } from 'react'
import { fetchDevices, toggleDevice } from '../api'
import { Zap, Droplets, Sun, Thermometer, Wind, Plus, RefreshCw } from 'lucide-react'
import './Devices.css'

const DEVICE_ICONS = {
  pump:   Droplets,
  light:  Sun,
  heater: Thermometer,
  fan:    Wind,
  valve:  Zap,
}

const DEVICE_COLORS = {
  pump:   'var(--blue)',
  light:  'var(--amber)',
  heater: 'var(--red)',
  fan:    'var(--green-bright)',
  valve:  'var(--purple)',
}

const ZONES = ['fish_tank', 'grow_bed', 'sump', 'greenhouse', 'main']

function DeviceCard({ device, onToggle }) {
  const Icon = DEVICE_ICONS[device.device_type] || Zap
  const color = DEVICE_COLORS[device.device_type] || 'var(--green-bright)'
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    await onToggle(device.id, !device.is_on)
    setLoading(false)
  }

  return (
    <div className={`card device-card ${device.is_on ? 'device-on' : ''}`} style={{ '--dcolor': color }}>
      <div className="device-card-top">
        <div className="device-icon-wrap" style={{ background: device.is_on ? color + '22' : 'var(--bg-elevated)', borderColor: device.is_on ? color : 'var(--border)' }}>
          <Icon size={22} style={{ color: device.is_on ? color : 'var(--text-dim)' }} />
        </div>
        <label className="toggle">
          <input type="checkbox" checked={!!device.is_on} onChange={handleToggle} disabled={loading} />
          <span className="toggle-track" />
        </label>
      </div>

      <div className="device-name">{device.name}</div>
      <div className="device-meta">
        <span className="device-type-tag">{device.device_type}</span>
        <span className="device-zone-tag">{device.zone}</span>
      </div>

      <div className={`device-status-row ${device.is_on ? 'status-on' : 'status-off'}`}>
        <span className="status-dot" />
        {device.is_on ? 'Running' : 'Standby'}
        {device.auto_mode ? <span className="auto-badge">AUTO</span> : null}
      </div>

      {device.gpio_pin && (
        <div className="device-pin">GPIO {device.gpio_pin}</div>
      )}
    </div>
  )
}

function AddDeviceModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    id: '', name: '', device_type: 'pump', zone: 'fish_tank', gpio_pin: '', notes: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.id || !form.name) return
    const payload = { ...form, gpio_pin: form.gpio_pin ? parseInt(form.gpio_pin) : null }
    const r = await fetch('/api/devices/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (r.ok) { onAdd(); onClose() }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Add Device</h2>
        <div className="modal-form">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Device ID</label>
              <input className="form-input" placeholder="pump_main" value={form.id} onChange={e => set('id', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" placeholder="Main Water Pump" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.device_type} onChange={e => set('device_type', e.target.value)}>
                {Object.keys(DEVICE_ICONS).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Zone</label>
              <select className="form-select" value={form.zone} onChange={e => set('zone', e.target.value)}>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">GPIO Pin (optional, for Raspberry Pi)</label>
            <input className="form-input" placeholder="e.g. 17" value={form.gpio_pin} onChange={e => set('gpio_pin', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" placeholder="Optional notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Add Device</button>
        </div>
      </div>
    </div>
  )
}

export default function Devices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    const data = await fetchDevices().catch(() => [])
    setDevices(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (id, is_on) => {
    await toggleDevice(id, is_on)
    setDevices(ds => ds.map(d => d.id === id ? { ...d, is_on: is_on ? 1 : 0 } : d))
  }

  const zones = ['all', ...new Set(devices.map(d => d.zone))]
  const filtered = filter === 'all' ? devices : devices.filter(d => d.zone === filter)

  const onCount = devices.filter(d => d.is_on).length

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Devices</h1>
          <p className="page-subtitle">
            {onCount} of {devices.length} devices running
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Device</button>
        </div>
      </div>

      {/* Zone filter tabs */}
      <div className="zone-tabs" style={{ marginBottom: 20 }}>
        {zones.map(z => (
          <button key={z} className={`chart-tab ${filter === z ? 'active' : ''}`} onClick={() => setFilter(z)}>
            {z}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(d => (
            <DeviceCard key={d.id} device={d} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} onAdd={load} />}
    </div>
  )
}
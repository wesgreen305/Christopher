import { useState, useEffect } from 'react'
import { fetchDevices, toggleDevice } from '../api'
import { Zap, Droplets, Sun, Thermometer, Wind, Plus, RefreshCw, X, Trash2, Save } from 'lucide-react'
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

const ZONES = ['fish_tank', 'grow_bed', 'sump', 'greenhouse', 'reservoir', 'compost', 'main']
const DEVICE_TYPES = ['pump', 'light', 'heater', 'fan', 'valve']

// ── Device Card ───────────────────────────────────────────────────────────────

function DeviceCard({ device, selected, onToggle, onClick }) {
  const Icon = DEVICE_ICONS[device.device_type] || Zap
  const color = DEVICE_COLORS[device.device_type] || 'var(--green-bright)'
  const [loading, setLoading] = useState(false)

  const handleToggle = async (e) => {
    e.stopPropagation()
    setLoading(true)
    await onToggle(device.id, !device.is_on)
    setLoading(false)
  }

  return (
    <div
      className={`card device-card ${device.is_on ? 'device-on' : ''} ${selected ? 'device-selected' : ''}`}
      style={{ '--dcolor': color, cursor: 'pointer' }}
      onClick={() => onClick(device)}
    >
      <div className="device-card-top">
        <div className="device-icon-wrap"
          style={{
            background: device.is_on ? color + '22' : 'var(--bg-elevated)',
            borderColor: device.is_on ? color : 'var(--border)'
          }}>
          <Icon size={22} style={{ color: device.is_on ? color : 'var(--text-dim)' }} />
        </div>
        <label className="toggle" onClick={e => e.stopPropagation()}>
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

      {device.gpio_pin && <div className="device-pin">GPIO {device.gpio_pin}</div>}
    </div>
  )
}

// ── Device Detail Panel ───────────────────────────────────────────────────────

function DeviceDetailPanel({ device, onClose, onDelete, onSave }) {
  const [form, setForm] = useState({
    name:        device.name,
    device_type: device.device_type,
    zone:        device.zone,
    gpio_pin:    device.gpio_pin || '',
    auto_mode:   !!device.auto_mode,
    notes:       device.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const Icon = DEVICE_ICONS[device.device_type] || Zap
  const color = DEVICE_COLORS[device.device_type] || 'var(--green-bright)'

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/devices/${device.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        gpio_pin: form.gpio_pin ? parseInt(form.gpio_pin) : null
      })
    })
    setSaving(false)
    onSave()
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${device.name}"? This will also remove all associated schedules.`)) return
    // Delete schedules referencing this device
    await fetch(`/api/schedules/by-device/${device.id}`, { method: 'DELETE' })
    // Delete device
    await fetch(`/api/devices/${device.id}`, { method: 'DELETE' })
    onDelete()
  }

  return (
    <div className="zone-detail-panel" style={{ width: 280 }}>
      <div className="zone-detail-header" style={{ borderColor: color }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon size={18} style={{ color }} />
          <div>
            <span className="zone-detail-type" style={{ color }}>{device.device_type}</span>
            <h2 className="zone-detail-name">{device.name}</h2>
          </div>
        </div>
        <button className="zone-detail-close" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="zone-detail-body">

        {/* Status */}
        <div className="zone-detail-stat">
          <span className="zone-detail-stat-label">Status</span>
          <span className={`device-status-row ${device.is_on ? 'status-on' : 'status-off'}`}
            style={{ margin: 0 }}>
            <span className="status-dot" />
            {device.is_on ? 'Running' : 'Standby'}
          </span>
        </div>

        {/* Edit fields */}
        <div className="zone-detail-section">
          <h4>Edit Device</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name}
                onChange={e => set('name', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.device_type}
                onChange={e => set('device_type', e.target.value)}>
                {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Zone</label>
              <select className="form-select" value={form.zone}
                onChange={e => set('zone', e.target.value)}>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GPIO Pin</label>
              <input className="form-input" type="number" placeholder="e.g. 17"
                value={form.gpio_pin} onChange={e => set('gpio_pin', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" placeholder="Optional..."
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Auto Mode</span>
              <label className="toggle">
                <input type="checkbox" checked={form.auto_mode}
                  onChange={e => set('auto_mode', e.target.checked)} />
                <span className="toggle-track" />
              </label>
            </div>

          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }}
          onClick={handleSave} disabled={saving}>
          <Save size={13} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button className="btn btn-danger" style={{ width: '100%' }}
          onClick={handleDelete}>
          <Trash2 size={13} /> Delete Device
        </button>

      </div>
    </div>
  )
}

// ── Add Device Modal ──────────────────────────────────────────────────────────

function AddDeviceModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    id: '', name: '', device_type: 'pump', zone: 'fish_tank', gpio_pin: '', notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.id || !form.name) return
    const r = await fetch('/api/devices/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, gpio_pin: form.gpio_pin ? parseInt(form.gpio_pin) : null })
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
              <input className="form-input" placeholder="pump_main"
                value={form.id} onChange={e => set('id', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" placeholder="Main Water Pump"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.device_type}
                onChange={e => set('device_type', e.target.value)}>
                {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Zone</label>
              <select className="form-select" value={form.zone}
                onChange={e => set('zone', e.target.value)}>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">GPIO Pin (optional)</label>
            <input className="form-input" placeholder="e.g. 17"
              value={form.gpio_pin} onChange={e => set('gpio_pin', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" placeholder="Optional..."
              value={form.notes} onChange={e => set('notes', e.target.value)} />
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Devices() {
  const [devices, setDevices] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    const data = await fetchDevices().catch(() => [])
    setDevices(data)
    setLoading(false)
    if (selected) {
      const updated = data.find(d => d.id === selected.id)
      setSelected(updated || null)
    }
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
    <div className="page" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Devices</h1>
          <p className="page-subtitle">{onCount} of {devices.length} devices running</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Device</button>
        </div>
      </div>

      {/* Zone filter tabs */}
      <div className="zone-tabs" style={{ marginBottom: 20 }}>
        {zones.map(z => (
          <button key={z} className={`chart-tab ${filter === z ? 'active' : ''}`}
            onClick={() => setFilter(z)}>
            {z}
          </button>
        ))}
      </div>

      {/* Cards + side panel */}
      <div style={{ display: 'flex', gap: 0, flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="grid-3">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}
            </div>
          ) : (
            <div className="grid-3" style={{ paddingRight: selected ? 16 : 0 }}>
              {filtered.map(d => (
                <DeviceCard key={d.id} device={d}
                  selected={selected?.id === d.id}
                  onToggle={handleToggle}
                  onClick={dev => setSelected(selected?.id === dev.id ? null : dev)}
                />
              ))}
            </div>
          )}
        </div>

        {selected && (
          <DeviceDetailPanel
            device={selected}
            onClose={() => setSelected(null)}
            onDelete={() => { setSelected(null); load() }}
            onSave={() => load()}
          />
        )}
      </div>

      {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} onAdd={load} />}
    </div>
  )
}
import { useState, useEffect } from 'react'
import { fetchDevices, toggleDevice } from '../api'
import { Zap, Droplets, Sun, Thermometer, Wind, Plus, RefreshCw, X, Trash2, Save } from 'lucide-react'

const DEVICE_ICONS = {
  pump:   Droplets,
  light:  Sun,
  heater: Thermometer,
  fan:    Wind,
  valve:  Zap,
}

const DEVICE_COLORS = {
  pump:   '#4ab8d8',
  light:  '#f0a830',
  heater: '#e05555',
  fan:    '#6dcc87',
  valve:  '#9b7fe8',
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
const DEVICE_TYPES = ['pump', 'light', 'heater', 'fan', 'valve']

// ── Device Detail Panel ───────────────────────────────────────────────────────

function DeviceDetailPanel({ device, onClose, onDelete, onSave, onToggle }) {
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
  const color = DEVICE_COLORS[device.device_type] || '#6dcc87'

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
    await fetch(`/api/schedules/by-device/${device.id}`, { method: 'DELETE' })
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

        <div className="zone-detail-stat">
          <span className="zone-detail-stat-label">Status</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`device-status-row ${device.is_on ? 'status-on' : 'status-off'}`}
              style={{ margin: 0 }}>
              <span className="status-dot" />
              {device.is_on ? 'Running' : 'Standby'}
            </span>
            <label className="toggle" style={{ marginLeft: 8 }}>
              <input type="checkbox" checked={!!device.is_on}
                onChange={e => onToggle(device.id, e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </div>
        </div>

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

        <button className="btn btn-danger" style={{ width: '100%', marginTop: 8 }}
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
    if (selected?.id === id) setSelected(s => ({ ...s, is_on: is_on ? 1 : 0 }))
  }

  // Group by zone
  const grouped = devices.reduce((acc, d) => {
    if (!acc[d.zone]) acc[d.zone] = []
    acc[d.zone].push(d)
    return acc
  }, {})

  const onCount = devices.filter(d => d.is_on).length

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Devices</h1>
          <p className="page-subtitle">{onCount} of {devices.length} running · click a row to inspect</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Device</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>

        {/* Zone-grouped table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ padding: 20, color: 'var(--text-dim)' }}>Loading...</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Device</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>GPIO</th>
                  <th>Auto</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([zone, zoneDevices]) => {
                  const zc = ZONE_COLORS[zone] || ZONE_COLORS.main
                  return zoneDevices.map((d, i) => {
                    const Icon = DEVICE_ICONS[d.device_type] || Zap
                    const dcolor = DEVICE_COLORS[d.device_type] || '#6dcc87'
                    const isSelected = selected?.id === d.id
                    return (
                      <tr key={d.id}
                        onClick={() => setSelected(isSelected ? null : d)}
                        style={{ cursor: 'pointer',
                          background: isSelected ? 'var(--bg-elevated)' : '' }}>

                        {i === 0 ? (
                          <td rowSpan={zoneDevices.length}
                            style={{ verticalAlign: 'middle', width: 120,
                              borderLeft: `4px solid ${zc.color}`,
                              background: zc.bg + '44' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                              fontWeight: 700, color: zc.color,
                              textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {zone.replace(/_/g, ' ')}
                            </span>
                          </td>
                        ) : null}

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Icon size={13} style={{ color: dcolor }} />
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                              {d.name}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                            color: dcolor, background: dcolor + '18',
                            border: `1px solid ${dcolor}44`,
                            padding: '2px 8px', borderRadius: 99 }}>
                            {d.device_type}
                          </span>
                        </td>

                        <td>
                          <div className={`device-status-row ${d.is_on ? 'status-on' : 'status-off'}`}
                            style={{ margin: 0 }}
                            onClick={e => { e.stopPropagation(); handleToggle(d.id, !d.is_on) }}>
                            <span className="status-dot" />
                            {d.is_on ? 'Running' : 'Standby'}
                          </div>
                        </td>

                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                          color: 'var(--text-dim)' }}>
                          {d.gpio_pin ? `GPIO ${d.gpio_pin}` : '—'}
                        </td>

                        <td>
                          {d.auto_mode ? (
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4,
                              background: 'var(--blue-dim)', color: 'var(--blue)',
                              fontFamily: 'var(--font-mono)' }}>AUTO</span>
                          ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })
                })}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <DeviceDetailPanel
            device={selected}
            onClose={() => setSelected(null)}
            onDelete={() => { setSelected(null); load() }}
            onSave={() => load()}
            onToggle={handleToggle}
          />
        )}
      </div>

      {showAdd && <AddDeviceModal onClose={() => setShowAdd(false)} onAdd={load} />}
    </div>
  )
}
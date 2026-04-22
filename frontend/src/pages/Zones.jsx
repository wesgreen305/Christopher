import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, Thermometer, Droplets, FlaskConical, Wind, Layers, Trash2, ChevronRight } from 'lucide-react'
import './Zones.css'

const ZONE_TYPES = {
  fish_tank:   { label: 'Fish Tank',    color: '#3b82f6', bg: '#dbeafe', border: '#93c5fd' },
  grow_bed:    { label: 'Grow Bed',     color: '#22c55e', bg: '#dcfce7', border: '#86efac' },
  sump:        { label: 'Sump',         color: '#8b5cf6', bg: '#ede9fe', border: '#c4b5fd' },
  greenhouse:  { label: 'Greenhouse',   color: '#f59e0b', bg: '#fef9c3', border: '#fde047' },
  reservoir:   { label: 'Reservoir',    color: '#0ea5e9', bg: '#e0f2fe', border: '#7dd3fc' },
  compost:     { label: 'Compost',      color: '#a16207', bg: '#fef3c7', border: '#fcd34d' },
}

const SENSOR_ICONS = {
  temperature: Thermometer,
  ph: FlaskConical,
  dissolved_oxygen: Wind,
  default: Droplets,
}

function ZoneBlock({ zone, selected, onClick, onDragEnd, onResizeEnd }) {
  const ref = useRef()
  const dragStart = useRef(null)
  const resizing = useRef(false)
  const meta = ZONE_TYPES[zone.zone_type] || ZONE_TYPES.fish_tank

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('resize-handle')) return
    e.preventDefault()
    dragStart.current = { mx: e.clientX, my: e.clientY, x: zone.pos_x, y: zone.pos_y }
    const move = (me) => {
      const dx = me.clientX - dragStart.current.mx
      const dy = me.clientY - dragStart.current.my
      ref.current.style.left = Math.max(0, dragStart.current.x + dx) + 'px'
      ref.current.style.top  = Math.max(0, dragStart.current.y + dy) + 'px'
    }
    const up = (me) => {
      const dx = me.clientX - dragStart.current.mx
      const dy = me.clientY - dragStart.current.my
      onDragEnd(zone.id, Math.max(0, dragStart.current.x + dx), Math.max(0, dragStart.current.y + dy))
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const handleResize = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startW = zone.width
    const startH = zone.height
    const move = (me) => {
      const w = Math.max(100, startW + me.clientX - startX)
      const h = Math.max(80,  startH + me.clientY - startY)
      ref.current.style.width  = w + 'px'
      ref.current.style.height = h + 'px'
    }
    const up = (me) => {
      const w = Math.max(100, startW + me.clientX - startX)
      const h = Math.max(80,  startH + me.clientY - startY)
      onResizeEnd(zone.id, w, h)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <div
      ref={ref}
      className={`zone-block ${selected ? 'selected' : ''}`}
      style={{
        left: zone.pos_x, top: zone.pos_y,
        width: zone.width, height: zone.height,
        '--zcolor': meta.color, '--zbg': meta.bg, '--zborder': meta.border,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onClick(zone) }}
    >
      <div className="zone-block-header">
        <span className="zone-type-dot" style={{ background: meta.color }} />
        <span className="zone-block-name">{zone.name}</span>
        <span className="zone-type-label">{meta.label}</span>
      </div>

      <div className="zone-block-sensors">
        {(zone.sensors || []).slice(0, 3).map((s, i) => {
          const Icon = SENSOR_ICONS[s.sensor_type] || SENSOR_ICONS.default
          return (
            <div key={i} className="zone-sensor-pill">
              <Icon size={10} />
              <span>{s.value?.toFixed(1)}{s.unit}</span>
            </div>
          )
        })}
      </div>

      <div className="zone-block-footer">
        <span>{zone.device_count || 0} devices</span>
        {zone.devices_on > 0 && (
          <span className="zone-active-dot">{zone.devices_on} on</span>
        )}
      </div>

      <div className="resize-handle" onMouseDown={handleResize} />
    </div>
  )
}

function ZoneDetail({ zone, onClose, onDelete, devices }) {
  const meta = ZONE_TYPES[zone.zone_type] || ZONE_TYPES.fish_tank
  const zoneDevices = devices.filter(d => d.zone === zone.name)

  return (
    <div className="zone-detail-panel">
      <div className="zone-detail-header" style={{ borderColor: meta.color }}>
        <div>
          <span className="zone-detail-type" style={{ color: meta.color }}>{meta.label}</span>
          <h2 className="zone-detail-name">{zone.name}</h2>
        </div>
        <button className="zone-detail-close" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="zone-detail-body">
        {zone.volume_liters && (
          <div className="zone-detail-stat">
            <span className="zone-detail-stat-label">Volume</span>
            <span className="zone-detail-stat-value">{zone.volume_liters}L</span>
          </div>
        )}
        {zone.notes && (
          <p className="zone-detail-notes">{zone.notes}</p>
        )}

        <div className="zone-detail-section">
          <h4>Live Sensors</h4>
          {(zone.sensors || []).length === 0 ? (
            <p className="zone-detail-empty">No sensor data yet</p>
          ) : (
            <div className="zone-sensor-list">
              {(zone.sensors || []).map((s, i) => {
                const Icon = SENSOR_ICONS[s.sensor_type] || SENSOR_ICONS.default
                return (
                  <div key={i} className="zone-sensor-row">
                    <Icon size={14} style={{ color: meta.color }} />
                    <span className="zone-sensor-type">{s.sensor_type.replace('_', ' ')}</span>
                    <span className="zone-sensor-val">{s.value?.toFixed(3)} {s.unit}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="zone-detail-section">
          <h4>Assigned Devices</h4>
          {zoneDevices.length === 0 ? (
            <p className="zone-detail-empty">No devices assigned</p>
          ) : (
            <div className="zone-device-list">
              {zoneDevices.map(d => (
                <div key={d.id} className="zone-device-row">
                  <span className={`zone-device-dot ${d.is_on ? 'on' : 'off'}`} />
                  <span className="zone-device-name">{d.name}</span>
                  <span className="zone-device-type">{d.device_type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-danger" style={{ width: '100%', marginTop: 12 }}
          onClick={() => onDelete(zone.id)}>
          <Trash2 size={13} /> Delete Zone
        </button>
      </div>
    </div>
  )
}

function AddZoneModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '', zone_type: 'fish_tank', volume_liters: '', notes: ''
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name) return
    const payload = {
      ...form,
      volume_liters: form.volume_liters ? parseFloat(form.volume_liters) : null,
      pos_x: 60, pos_y: 60, width: 180, height: 130
    }
    const r = await fetch('/api/zones/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (r.ok) { onAdd(); onClose() }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Add Zone</h2>
        <div className="modal-form">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Zone Name</label>
              <input className="form-input" placeholder="e.g. Main Tank"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.zone_type} onChange={e => set('zone_type', e.target.value)}>
                {Object.entries(ZONE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Volume (litres, optional)</label>
            <input className="form-input" type="number" placeholder="e.g. 200"
              value={form.volume_liters} onChange={e => set('volume_liters', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input className="form-input" placeholder="Optional description..."
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Add Zone</button>
        </div>
      </div>
    </div>
  )
}

export default function Zones() {
  const [zones, setZones] = useState([])
  const [devices, setDevices] = useState([])
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const canvasRef = useRef()

  const load = async () => {
    const [z, d] = await Promise.all([
      fetch('/api/zones/').then(r => r.json()).catch(() => []),
      fetch('/api/devices/').then(r => r.json()).catch(() => []),
    ])
    setZones(z)
    setDevices(d)
    if (selected) {
      const updated = z.find(zone => zone.id === selected.id)
      if (updated) setSelected(updated)
    }
  }

  useEffect(() => { load() }, [])

  const handleDragEnd = async (id, x, y) => {
    await fetch(`/api/zones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pos_x: x, pos_y: y })
    })
    setZones(zs => zs.map(z => z.id === id ? { ...z, pos_x: x, pos_y: y } : z))
  }

  const handleResizeEnd = async (id, width, height) => {
    await fetch(`/api/zones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ width, height })
    })
    setZones(zs => zs.map(z => z.id === id ? { ...z, width, height } : z))
  }

  const handleDelete = async (id) => {
    await fetch(`/api/zones/${id}`, { method: 'DELETE' })
    setSelected(null)
    load()
  }

  return (
    <div className="page zones-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Zone Map</h1>
          <p className="page-subtitle">Drag to reposition · Corner to resize · Click to inspect</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Zone
        </button>
      </div>

      <div className="zones-layout">
        <div
          ref={canvasRef}
          className="floor-plan-canvas"
          onClick={() => setSelected(null)}
        >
          <div className="canvas-grid" />
          <div className="canvas-label">FLOOR PLAN</div>

          {zones.map(zone => (
            <ZoneBlock
              key={zone.id}
              zone={zone}
              selected={selected?.id === zone.id}
              onClick={setSelected}
              onDragEnd={handleDragEnd}
              onResizeEnd={handleResizeEnd}
            />
          ))}

          {zones.length === 0 && (
            <div className="canvas-empty">
              <Layers size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>No zones yet. Add your first zone to get started.</p>
            </div>
          )}
        </div>

        {selected && (
          <ZoneDetail
            zone={selected}
            devices={devices}
            onClose={() => setSelected(null)}
            onDelete={handleDelete}
          />
        )}
      </div>

      {showAdd && <AddZoneModal onClose={() => setShowAdd(false)} onAdd={load} />}
    </div>
  )
}
import { useState, useEffect } from 'react'
import { fetchSchedules, fetchDevices, createSchedule, deleteSchedule } from '../api'
import { Plus, Trash2, CalendarClock, Clock } from 'lucide-react'
import './Scheduler.css'

const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const DAY_LABELS = { mon:'M', tue:'T', wed:'W', thu:'T', fri:'F', sat:'S', sun:'S' }

function DayPicker({ value, onChange }) {
  const selected = value ? value.split(',') : []
  const toggle = (d) => {
    const next = selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d]
    onChange(next.join(','))
  }
  return (
    <div className="day-picker">
      {DAYS.map(d => (
        <button key={d} type="button"
          className={`day-btn ${selected.includes(d) ? 'active' : ''}`}
          onClick={() => toggle(d)}>
          {DAY_LABELS[d]}
        </button>
      ))}
    </div>
  )
}

function ScheduleRow({ schedule, onDelete }) {
  const days = schedule.days_of_week ? schedule.days_of_week.split(',') : []
  return (
    <tr>
      <td><span className="schedule-name">{schedule.name}</span></td>
      <td><span className="device-chip">{schedule.device_name || schedule.device_id}</span></td>
      <td>
        <div className="time-range">
          {schedule.time_on && <span className="time-on">{schedule.time_on}</span>}
          {schedule.time_on && schedule.time_off && <span style={{color:'var(--text-dim)'}}>→</span>}
          {schedule.time_off && <span className="time-off">{schedule.time_off}</span>}
        </div>
      </td>
      <td>
        <div className="days-display">
          {DAYS.map(d => (
            <span key={d} className={`day-dot ${days.includes(d) ? 'active' : ''}`}>{DAY_LABELS[d]}</span>
          ))}
        </div>
      </td>
      <td>
        <span className={`status-badge ${schedule.is_active ? 'active' : 'inactive'}`}>
          {schedule.is_active ? 'Active' : 'Paused'}
        </span>
      </td>
      <td>
        <button className="btn btn-danger" style={{padding:'5px 10px'}} onClick={() => onDelete(schedule.id)}>
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

export default function Scheduler() {
  const [schedules, setSchedules] = useState([])
  const [devices, setDevices] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', device_id: '', time_on: '06:00', time_off: '22:00',
    days_of_week: 'mon,tue,wed,thu,fri,sat,sun', is_active: true
  })

  const load = async () => {
    const [s, d] = await Promise.all([fetchSchedules(), fetchDevices()])
    setSchedules(s)
    setDevices(d)
    if (d.length && !form.device_id) setForm(f => ({ ...f, device_id: d[0].id }))
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name || !form.device_id) return
    await createSchedule({ ...form, action: 'on' })
    setShowForm(false)
    setForm(f => ({ ...f, name: '' }))
    load()
  }

  const remove = async (id) => {
    await deleteSchedule(id)
    setSchedules(s => s.filter(x => x.id !== id))
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Scheduler</h1>
          <p className="page-subtitle">{schedules.length} automation rules</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          <Plus size={14} /> New Schedule
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeIn 0.2s ease' }}>
          <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>New Automation Rule</h3>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Rule Name</label>
              <input className="form-input" placeholder="e.g. Morning Lights On"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Device</label>
              <select className="form-select" value={form.device_id} onChange={e => set('device_id', e.target.value)}>
                {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Turn On At</label>
              <input className="form-input" type="time" value={form.time_on}
                onChange={e => set('time_on', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Turn Off At</label>
              <input className="form-input" type="time" value={form.time_off}
                onChange={e => set('time_off', e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Days of Week</label>
            <DayPicker value={form.days_of_week} onChange={v => set('days_of_week', v)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submit}>Save Schedule</button>
          </div>
        </div>
      )}

      <div className="card">
        {schedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            <CalendarClock size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>No schedules yet. Create one above.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Device</th>
                <th>Time</th>
                <th>Days</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => (
                <ScheduleRow key={s.id} schedule={s} onDelete={remove} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
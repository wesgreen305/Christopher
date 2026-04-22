import { useState, useEffect } from 'react'
import { fetchAlertRules, fetchAlertHistory } from '../api'
import { Bell, BellOff, AlertTriangle, CheckCircle, Plus, Trash2 } from 'lucide-react'
import './Alerts.css'

const SENSOR_TYPES = ['temperature','ph','dissolved_oxygen','ammonia','nitrite','nitrate','tds','water_level']
const ZONES = ['fish_tank','grow_bed','sump','greenhouse','main']

function AlertRuleRow({ rule, onDelete }) {
  return (
    <tr>
      <td><span className="rule-name">{rule.name}</span></td>
      <td><span className="sensor-tag">{rule.sensor_type}</span></td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{rule.zone}</td>
      <td>
        <span className={`condition-tag ${rule.condition}`}>
          {rule.condition === 'above' ? '▲ above' : '▼ below'} {rule.threshold}
        </span>
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-dim)', maxWidth: 200 }}>{rule.message}</td>
      <td>
        <span className={`status-badge ${rule.is_active ? 'active' : 'inactive'}`}>
          {rule.is_active ? 'Active' : 'Off'}
        </span>
      </td>
      <td>
        <button className="btn btn-danger" style={{ padding: '5px 10px' }} onClick={() => onDelete(rule.id)}>
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

function AlertHistoryRow({ alert }) {
  const time = new Date(alert.triggered_at + 'Z').toLocaleString()
  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{alert.message}</span>
        </div>
      </td>
      <td><span className="sensor-tag">{alert.sensor_type}</span></td>
      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--amber)' }}>
        {alert.value?.toFixed(3)}
      </td>
      <td style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{time}</td>
      <td>
        {alert.resolved
          ? <span className="status-badge active"><CheckCircle size={11} /> Resolved</span>
          : <span className="status-badge warn">Open</span>
        }
      </td>
    </tr>
  )
}

export default function AlertsPage() {
  const [rules, setRules] = useState([])
  const [history, setHistory] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState('history')
  const [form, setForm] = useState({
    name: '', sensor_type: 'ph', zone: 'fish_tank',
    condition: 'below', threshold: '', message: ''
  })

  const load = async () => {
    const [r, h] = await Promise.all([fetchAlertRules(), fetchAlertHistory()])
    setRules(r)
    setHistory(h)
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name || !form.threshold) return
    await fetch('/api/alerts/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, threshold: parseFloat(form.threshold) })
    })
    setShowForm(false)
    setForm(f => ({ ...f, name: '', threshold: '', message: '' }))
    load()
  }

  const deleteRule = async (id) => {
    await fetch(`/api/alerts/rules/${id}`, { method: 'DELETE' })
    setRules(r => r.filter(x => x.id !== id))
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">
            {rules.filter(r => r.is_active).length} active rules ·{' '}
            {history.filter(h => !h.resolved).length} open alerts
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          <Plus size={14} /> New Rule
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeIn 0.2s ease' }}>
          <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-secondary)' }}>New Alert Rule</h3>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Rule Name</label>
              <input className="form-input" placeholder="e.g. pH Too Low"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Sensor Type</label>
              <select className="form-select" value={form.sensor_type} onChange={e => set('sensor_type', e.target.value)}>
                {SENSOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-3" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">Zone</label>
              <select className="form-select" value={form.zone} onChange={e => set('zone', e.target.value)}>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Condition</label>
              <select className="form-select" value={form.condition} onChange={e => set('condition', e.target.value)}>
                <option value="above">Above threshold</option>
                <option value="below">Below threshold</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Threshold Value</label>
              <input className="form-input" type="number" step="0.01" placeholder="e.g. 6.5"
                value={form.threshold} onChange={e => set('threshold', e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Alert Message</label>
            <input className="form-input" placeholder="Describe what this alert means..."
              value={form.message} onChange={e => set('message', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submit}>Save Rule</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="alert-tabs" style={{ marginBottom: 16 }}>
        <button className={`chart-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          Alert History ({history.length})
        </button>
        <button className={`chart-tab ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>
          Rules ({rules.length})
        </button>
      </div>

      {tab === 'rules' && (
        <div className="card">
          {rules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              <BellOff size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p>No alert rules configured.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Sensor</th><th>Zone</th><th>Condition</th><th>Message</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rules.map(r => <AlertRuleRow key={r.id} rule={r} onDelete={deleteRule} />)}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              <Bell size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p>No alerts triggered yet.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Message</th><th>Sensor</th><th>Value</th><th>Time</th><th>Status</th></tr>
              </thead>
              <tbody>
                {history.map(h => <AlertHistoryRow key={h.id} alert={h} />)}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
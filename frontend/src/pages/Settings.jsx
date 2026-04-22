import { useState } from 'react'
import { Moon, Sun, Monitor, RefreshCw, Save } from 'lucide-react'
import './Settings.css'

const THEMES = [
  { id: 'dark',   label: 'Dark',   icon: Moon },
  { id: 'light',  label: 'Light',  icon: Sun },
  { id: 'system', label: 'System', icon: Monitor },
]

const REFRESH_RATES = [
  { value: 5,  label: '5 seconds' },
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
]

function SettingRow({ label, description, children }) {
  return (
    <div className="setting-row">
      <div className="setting-info">
        <span className="setting-label">{label}</span>
        {description && <span className="setting-desc">{description}</span>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{title}</h3>
      <div className="settings-section-body">{children}</div>
    </div>
  )
}

export default function Settings({ theme, setTheme }) {
  const [refreshRate, setRefreshRate] = useState(() =>
    parseInt(localStorage.getItem('refreshRate') || '15'))
  const [alertSound, setAlertSound] = useState(() =>
    localStorage.getItem('alertSound') !== 'false')
  const [compactMode, setCompactMode] = useState(() =>
    localStorage.getItem('compactMode') === 'true')
  const [apiUrl, setApiUrl] = useState(() =>
    localStorage.getItem('apiUrl') || 'http://localhost:8000')
  const [saved, setSaved] = useState(false)

  const save = () => {
    localStorage.setItem('refreshRate', refreshRate)
    localStorage.setItem('alertSound', alertSound)
    localStorage.setItem('compactMode', compactMode)
    localStorage.setItem('apiUrl', apiUrl)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const regenerateMockData = async () => {
    if (!confirm('Reseed 48h of mock sensor data into the database?')) return
    await fetch('/api/sensors/mock/generate', { method: 'POST' })
    alert('Mock data regenerated.')
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Preferences and system configuration</p>
        </div>
        <button className="btn btn-primary" onClick={save}>
          <Save size={14} /> {saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>

      <div className="settings-grid">

        <Section title="Appearance">
          <SettingRow label="Theme" description="Choose your preferred colour scheme">
            <div className="theme-picker">
              {THEMES.map(t => {
                const Icon = t.icon
                return (
                  <button key={t.id}
                    className={`theme-btn ${theme === t.id ? 'active' : ''}`}
                    onClick={() => setTheme(t.id)}>
                    <Icon size={14} /> {t.label}
                  </button>
                )
              })}
            </div>
          </SettingRow>

          <SettingRow label="Compact Mode" description="Reduce spacing and font sizes throughout the UI">
            <label className="toggle">
              <input type="checkbox" checked={compactMode}
                onChange={e => setCompactMode(e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </SettingRow>
        </Section>

        <Section title="Data & Sensors">
          <SettingRow label="Dashboard Refresh Rate" description="How often live sensor readings update">
            <select className="form-select" style={{ width: 140 }}
              value={refreshRate} onChange={e => setRefreshRate(parseInt(e.target.value))}>
              {REFRESH_RATES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </SettingRow>

          <SettingRow label="Regenerate Mock Data" description="Reseed 48h of realistic test data">
            <button className="btn btn-ghost" onClick={regenerateMockData}>
              <RefreshCw size={13} /> Regenerate
            </button>
          </SettingRow>
        </Section>

        <Section title="Alerts">
          <SettingRow label="Alert Sounds" description="Play a sound when a threshold is triggered">
            <label className="toggle">
              <input type="checkbox" checked={alertSound}
                onChange={e => setAlertSound(e.target.checked)} />
              <span className="toggle-track" />
            </label>
          </SettingRow>
        </Section>

        <Section title="Connection">
          <SettingRow label="API Base URL" description="Change if running the backend on a Pi or remote server">
            <input className="form-input" style={{ width: 220 }}
              value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
          </SettingRow>
        </Section>

      </div>
    </div>
  )
}
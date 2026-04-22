import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Zones from './pages/Zones'
import Sensors from './pages/Sensors'
import Devices from './pages/Devices'
import Scheduler from './pages/Scheduler'
import AlertsPage from './pages/Alerts'
import Settings from './pages/Settings'
import { checkAlerts } from './api'
import {
  LayoutDashboard, Cpu, CalendarClock, Bell, Droplets,
  Wifi, WifiOff, Layers, Activity, Settings as SettingsIcon
} from 'lucide-react'
import './App.css'

export default function App() {
  const [online, setOnline] = useState(true)
  const [alerts, setAlerts] = useState(0)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
    root.setAttribute('data-theme', resolved)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.ok ? setOnline(true) : setOnline(false))
      .catch(() => setOnline(false))

    const poll = setInterval(async () => {
      const result = await checkAlerts().catch(() => null)
      if (result?.triggered) setAlerts(a => a + result.triggered)
    }, 30000)
    return () => clearInterval(poll)
  }, [])

  return (
    <BrowserRouter>
      <div className="app-shell">
        <nav className="sidebar">
          <div className="sidebar-logo">
            <Droplets size={20} className="logo-icon" />
            <span className="logo-text">Christopher<em>OS</em></span>
          </div>

          <div className="nav-links">
            <NavLink to="/" end className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={16} /> Dashboard
            </NavLink>
            <NavLink to="/zones" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Layers size={16} /> Zones
            </NavLink>
            <NavLink to="/sensors" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Activity size={16} /> Sensors
            </NavLink>
            <NavLink to="/devices" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Cpu size={16} /> Devices
            </NavLink>
            <NavLink to="/scheduler" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <CalendarClock size={16} /> Schedules
            </NavLink>
            <NavLink to="/alerts" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <Bell size={16} /> Alerts
              {alerts > 0 && <span className="badge">{alerts}</span>}
            </NavLink>
          </div>

          <div className="sidebar-footer">
            <NavLink to="/settings" className={({isActive}) => `nav-item settings-nav-item ${isActive ? 'active' : ''}`}>
              <SettingsIcon size={16} /> Settings
            </NavLink>
            <div className={`status-pill ${online ? 'online' : 'offline'}`}>
              {online ? <Wifi size={12}/> : <WifiOff size={12}/>}
              {online ? 'API Online' : 'API Offline'}
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/zones"     element={<Zones />} />
            <Route path="/sensors"   element={<Sensors />} />
            <Route path="/devices"   element={<Devices />} />
            <Route path="/scheduler" element={<Scheduler />} />
            <Route path="/alerts"    element={<AlertsPage />} />
            <Route path="/settings"  element={<Settings theme={theme} setTheme={setTheme} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
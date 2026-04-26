import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API_BASE = 'http://localhost:5000/api';

// Sample data for dashboard
const generateSensorData = () => {
  return Array.from({ length: 12 }, (_, i) => ({
    time: `${i}:00`,
    pm25: Math.random() * 100 + 20,
    pm10: Math.random() * 150 + 40,
    co2: Math.random() * 400 + 300,
  }));
};

const generateAqiData = () => {
  return [
    { name: 'Good', value: 15, color: '#10B981' },
    { name: 'Moderate', value: 35, color: '#F59E0B' },
    { name: 'Poor', value: 30, color: '#EF4444' },
    { name: 'Very Poor', value: 20, color: '#8B5CF6' },
  ];
};

export default function AirWatch() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sensorData, setSensorData] = useState(generateSensorData());
  const [aqiData, setAqiData] = useState(generateAqiData());
  const [metrics, setMetrics] = useState({
    avgPM25: 65.3,
    avgPM10: 92.1,
    avgCO2: 485.2,
    airQualityIndex: 156,
  });

  // Check if user is logged in from localStorage
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
      // Simulate fetching real data
      fetchSensorData();
    }
  }, []);

  const fetchSensorData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/sensors/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSensorData(data);
      }
    } catch (error) {
      console.log('Using sample data');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsLoggedIn(true);
        setUser(data.user);
        setEmail('');
        setPassword('');
        fetchSensorData();
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (error) {
      alert('Connection error. Make sure backend is running.');
      // For demo, allow login anyway
      setIsLoggedIn(true);
      setUser({ email, name: email.split('@')[0] });
      localStorage.setItem('authToken', 'demo-token');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
  };

  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2rem',
        }}>
          {/* Logo / Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '3rem',
          }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              color: '#14B8A6',
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em',
            }}>
              AirWatch
            </div>
            <p style={{
              color: '#94a3b8',
              fontSize: '0.95rem',
              margin: 0,
            }}>
              Real-time air quality monitoring
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '2rem',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                color: '#e2e8f0',
                fontSize: '0.9rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                }}
                onFocus={(e) => e.target.style.borderColor = '#14B8A6'}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                color: '#e2e8f0',
                fontSize: '0.9rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  transition: 'all 0.3s ease',
                }}
                onFocus={(e) => e.target.style.borderColor = '#14B8A6'}
                onBlur={(e) => e.target.style.borderColor = '#334155'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: loading ? '#0f766e' : '#14B8A6',
                color: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: loading ? 0.7 : 1,
              }}
              onHover={(e) => !loading && (e.target.style.background = '#0d9488')}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <p style={{
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.85rem',
              marginTop: '1rem',
              margin: 0,
            }}>
              Demo credentials: test@airwatch.com / password
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(90deg, #1e293b 0%, #0f172a 100%)',
        borderBottom: '1px solid #334155',
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#14B8A6', fontSize: '1.5rem', fontWeight: 700 }}>
            AirWatch Dashboard
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1.25rem',
            background: 'transparent',
            border: '1px solid #334155',
            color: '#94a3b8',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#ef4444';
            e.target.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#334155';
            e.target.style.color = '#94a3b8';
          }}
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Key Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          {[
            { label: 'PM2.5 Average', value: `${metrics.avgPM25.toFixed(1)} µg/m³`, color: '#f59e0b' },
            { label: 'PM10 Average', value: `${metrics.avgPM10.toFixed(1)} µg/m³`, color: '#ef4444' },
            { label: 'CO2 Level', value: `${metrics.avgCO2.toFixed(0)} ppm`, color: '#3b82f6' },
            { label: 'Air Quality Index', value: metrics.airQualityIndex, color: '#14B8A6' },
          ].map((metric, i) => (
            <div
              key={i}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                padding: '1.5rem',
                borderLeft: `4px solid ${metric.color}`,
              }}
            >
              <p style={{ margin: '0 0 0.75rem', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 500 }}>
                {metric.label}
              </p>
              <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: metric.color }}>
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          {/* Line Chart */}
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '1.5rem',
          }}>
            <h3 style={{ margin: '0 0 1.5rem', color: '#e2e8f0', fontSize: '1rem', fontWeight: 600 }}>
              Pollution Levels (24h)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="pm25" stroke="#f59e0b" strokeWidth={2} name="PM2.5" />
                <Line type="monotone" dataKey="pm10" stroke="#ef4444" strokeWidth={2} name="PM10" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '1.5rem',
          }}>
            <h3 style={{ margin: '0 0 1.5rem', color: '#e2e8f0', fontSize: '1rem', fontWeight: 600 }}>
              Air Quality Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={aqiData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {aqiData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '1.5rem',
        }}>
          <h3 style={{ margin: '0 0 1.5rem', color: '#e2e8f0', fontSize: '1rem', fontWeight: 600 }}>
            CO2 Emissions Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sensorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Bar dataKey="co2" fill="#14B8A6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
}

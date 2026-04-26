-- PostgreSQL Schema for AirWatch
-- This will be automatically created by the server.js on startup
-- But you can also run this manually if needed

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sensor_data table
CREATE TABLE IF NOT EXISTS sensor_data (
  id SERIAL PRIMARY KEY,
  sensor_id VARCHAR(255),
  pm25 DECIMAL(8, 2),
  pm10 DECIMAL(8, 2),
  co2 DECIMAL(8, 2),
  humidity DECIMAL(5, 2),
  temperature DECIMAL(5, 2),
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sensor_id ON sensor_data(sensor_id);
CREATE INDEX IF NOT EXISTS idx_recorded_at ON sensor_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_sensor_time ON sensor_data(sensor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_location ON sensor_data(location);

-- Create sensor_alerts table (for future alerts system)
CREATE TABLE IF NOT EXISTS sensor_alerts (
  id SERIAL PRIMARY KEY,
  sensor_id VARCHAR(255),
  alert_type VARCHAR(50),
  threshold_value DECIMAL(8, 2),
  current_value DECIMAL(8, 2),
  message TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

-- Insert sample user (email: test@airwatch.com, password: password)
-- Password hash: $2a$10$... (bcryptjs hash of "password")
INSERT INTO users (email, password, name) 
VALUES (
  'test@airwatch.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/e.q',
  'Test User'
) ON CONFLICT (email) DO NOTHING;

-- View for getting latest sensor readings
CREATE OR REPLACE VIEW latest_sensor_readings AS
SELECT DISTINCT ON (sensor_id)
  sensor_id,
  location,
  pm25,
  pm10,
  co2,
  humidity,
  temperature,
  latitude,
  longitude,
  recorded_at
FROM sensor_data
ORDER BY sensor_id, recorded_at DESC;

-- View for hourly aggregation
CREATE OR REPLACE VIEW hourly_sensor_aggregates AS
SELECT
  sensor_id,
  DATE_TRUNC('hour', recorded_at) as hour,
  AVG(pm25) as avg_pm25,
  MAX(pm25) as max_pm25,
  AVG(pm10) as avg_pm10,
  MAX(pm10) as max_pm10,
  AVG(co2) as avg_co2,
  MAX(co2) as max_co2,
  AVG(humidity) as avg_humidity,
  AVG(temperature) as avg_temperature,
  COUNT(*) as reading_count
FROM sensor_data
GROUP BY sensor_id, DATE_TRUNC('hour', recorded_at)
ORDER BY hour DESC;

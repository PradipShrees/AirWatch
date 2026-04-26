// server.js - AirWatch Backend with Kafka Integration
// npm install express cors dotenv jsonwebtoken bcryptjs pg kafkajs

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { Kafka } = require('kafkajs');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== DATABASE SETUP ====================
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'airwatch',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ==================== KAFKA SETUP ====================
const kafka = new Kafka({
  clientId: 'airwatch-server',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const consumer = kafka.consumer({ groupId: 'airwatch-group' });

// ==================== INITIALIZE DATABASE ====================
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Creating database tables...');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sensor data table
    await client.query(`
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
    `);

    // Create indexes for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sensor_id ON sensor_data(sensor_id);
      CREATE INDEX IF NOT EXISTS idx_recorded_at ON sensor_data(recorded_at);
    `);

    // Sample user
    const userExists = await client.query(
      'SELECT * FROM users WHERE email = $1',
      ['test@airwatch.com']
    );

    if (userExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      await client.query(
        'INSERT INTO users (email, password, name) VALUES ($1, $2, $3)',
        ['test@airwatch.com', hashedPassword, 'Test User']
      );
      console.log('Sample user created: test@airwatch.com / password');
    }

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Database initialization error:', error);
  } finally {
    client.release();
  }
}

// ==================== KAFKA CONSUMER ====================
async function startKafkaConsumer() {
  try {
    await consumer.connect();
    console.log('Kafka consumer connected');

    await consumer.subscribe({ 
      topic: process.env.KAFKA_TOPIC || 'sensor-data',
      fromBeginning: false 
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const sensorData = JSON.parse(message.value.toString());
          
          // Validate required fields
          if (!sensorData.sensor_id || !sensorData.pm25) {
            console.warn('Invalid sensor data received:', sensorData);
            return;
          }

          // Insert into database
          await pool.query(
            `INSERT INTO sensor_data 
            (sensor_id, pm25, pm10, co2, humidity, temperature, location, latitude, longitude, recorded_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              sensorData.sensor_id,
              sensorData.pm25,
              sensorData.pm10 || null,
              sensorData.co2 || null,
              sensorData.humidity || null,
              sensorData.temperature || null,
              sensorData.location || null,
              sensorData.latitude || null,
              sensorData.longitude || null,
              sensorData.recorded_at || new Date().toISOString(),
            ]
          );

          console.log(`Sensor data stored from ${sensorData.sensor_id}`);
        } catch (error) {
          console.error('Error processing Kafka message:', error);
        }
      },
    });

    console.log('Kafka consumer running and listening for messages...');
  } catch (error) {
    console.error('Kafka consumer error:', error);
    setTimeout(startKafkaConsumer, 5000); // Retry after 5 seconds
  }
}

// ==================== MIDDLEWARE ====================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== ROUTES - AUTHENTICATION ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name || email.split('@')[0]]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ==================== ROUTES - SENSOR DATA ====================

// Get latest sensor data
app.get('/api/sensors/latest', authenticateToken, async (req, res) => {
  try {
    const limit = req.query.limit || 12;
    const result = await pool.query(
      `SELECT * FROM sensor_data 
       ORDER BY recorded_at DESC 
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
  }
});

// Get sensor data by sensor_id
app.get('/api/sensors/:sensorId', authenticateToken, async (req, res) => {
  try {
    const { sensorId } = req.params;
    const hours = req.query.hours || 24;

    const result = await pool.query(
      `SELECT * FROM sensor_data 
       WHERE sensor_id = $1 
       AND recorded_at > NOW() - INTERVAL '${hours} hours'
       ORDER BY recorded_at DESC`,
      [sensorId]
    );

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
  }
});

// Get aggregated metrics
app.get('/api/sensors/metrics/summary', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        AVG(pm25) as avg_pm25,
        AVG(pm10) as avg_pm10,
        AVG(co2) as avg_co2,
        MAX(pm25) as max_pm25,
        MAX(pm10) as max_pm10,
        MAX(co2) as max_co2,
        COUNT(*) as total_readings
       FROM sensor_data 
       WHERE recorded_at > NOW() - INTERVAL '24 hours'`
    );

    const metrics = result.rows[0];
    res.json({
      avgPM25: parseFloat(metrics.avg_pm25) || 0,
      avgPM10: parseFloat(metrics.avg_pm10) || 0,
      avgCO2: parseFloat(metrics.avg_co2) || 0,
      maxPM25: parseFloat(metrics.max_pm25) || 0,
      maxPM10: parseFloat(metrics.max_pm10) || 0,
      maxCO2: parseFloat(metrics.max_co2) || 0,
      totalReadings: parseInt(metrics.total_readings) || 0,
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get AQI distribution
app.get('/api/sensors/aqi/distribution', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        SUM(CASE WHEN pm25 < 35 THEN 1 ELSE 0 END) as good,
        SUM(CASE WHEN pm25 >= 35 AND pm25 < 75 THEN 1 ELSE 0 END) as moderate,
        SUM(CASE WHEN pm25 >= 75 AND pm25 < 115 THEN 1 ELSE 0 END) as poor,
        SUM(CASE WHEN pm25 >= 115 THEN 1 ELSE 0 END) as very_poor
       FROM sensor_data 
       WHERE recorded_at > NOW() - INTERVAL '24 hours'`
    );

    const data = result.rows[0];
    res.json({
      good: parseInt(data.good) || 0,
      moderate: parseInt(data.moderate) || 0,
      poor: parseInt(data.poor) || 0,
      veryPoor: parseInt(data.very_poor) || 0,
    });
  } catch (error) {
    console.error('Error fetching AQI distribution:', error);
    res.status(500).json({ error: 'Failed to fetch AQI distribution' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date().toISOString() });
});

// ==================== START SERVER ====================
async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    // Start Kafka consumer
    await startKafkaConsumer();

    // Start Express server
    app.listen(port, () => {
      console.log(`✅ AirWatch backend running on http://localhost:${port}`);
      console.log(`📊 API endpoints:`);
      console.log(`   POST   /api/auth/login`);
      console.log(`   POST   /api/auth/register`);
      console.log(`   GET    /api/sensors/latest`);
      console.log(`   GET    /api/sensors/:sensorId`);
      console.log(`   GET    /api/sensors/metrics/summary`);
      console.log(`   GET    /api/sensors/aqi/distribution`);
      console.log(`📡 Kafka consumer listening on topic: ${process.env.KAFKA_TOPIC || 'sensor-data'}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await consumer.disconnect();
  await pool.end();
  process.exit(0);
});

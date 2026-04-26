// kafka-producer.js - Send test sensor data to Kafka
// Run with: node kafka-producer.js

const { Kafka } = require('kafkajs');
const dotenv = require('dotenv');

dotenv.config();

const kafka = new Kafka({
  clientId: 'airwatch-producer',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const producer = kafka.producer();

// Sample sensors
const sensors = [
  { id: 'sensor-001', location: 'Downtown', lat: -33.8688, lng: 151.2093 },
  { id: 'sensor-002', location: 'Airport', lat: -33.9461, lng: 151.1772 },
  { id: 'sensor-003', location: 'Beach', lat: -33.8568, lng: 151.2153 },
  { id: 'sensor-004', location: 'Industrial', lat: -33.9249, lng: 151.0890 },
];

async function generateAndSendSensorData() {
  try {
    await producer.connect();
    console.log('✅ Kafka producer connected');

    // Send data every 5 seconds
    setInterval(async () => {
      const sensor = sensors[Math.floor(Math.random() * sensors.length)];

      const sensorData = {
        sensor_id: sensor.id,
        location: sensor.location,
        latitude: sensor.lat,
        longitude: sensor.lng,
        pm25: Math.random() * 150 + 10, // 10-160
        pm10: Math.random() * 200 + 20, // 20-220
        co2: Math.random() * 400 + 300, // 300-700
        humidity: Math.random() * 40 + 30, // 30-70%
        temperature: Math.random() * 15 + 15, // 15-30°C
        recorded_at: new Date().toISOString(),
      };

      await producer.send({
        topic: process.env.KAFKA_TOPIC || 'sensor-data',
        messages: [
          {
            key: sensor.id,
            value: JSON.stringify(sensorData),
          },
        ],
      });

      console.log(`📡 Sent: ${sensor.id} - PM2.5: ${sensorData.pm25.toFixed(2)}, CO2: ${sensorData.co2.toFixed(0)}`);
    }, 5000); // Send every 5 seconds

    console.log('🚀 Sending sensor data every 5 seconds... (Press Ctrl+C to stop)');
  } catch (error) {
    console.error('❌ Kafka producer error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Stopping producer...');
  await producer.disconnect();
  process.exit(0);
});

generateAndSendSensorData();

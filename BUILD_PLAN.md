# AirWatch Build Plan

## Status: IN PROGRESS

## Decisions Made
- **Kafka**: Apache Kafka 3.7.0 (KRaft, no ZooKeeper) in Docker
- **Database**: PostgreSQL 16 in Docker
- **Backend**: FastAPI (single app — auth + devices + WebSocket dashboard API)
- **Frontend**: React + Vite
- **Remote access**: Tailscale only
- **Notifications**: Email via SMTP (aiosmtplib)
- **Device provisioning**: Admin-only via protected `/admin/provision` endpoint
- **Venv**: `/home/raspberry/airwatch/venv`

## Infrastructure
- Docker Compose: `/home/raspberry/airwatch/docker/docker-compose.yml`
  - PostgreSQL 16 on port 5432 (db: airwatch, user: airwatch, pass: airwatch_secret)
  - Kafka 3.7.0 (KRaft) on port 9092

## Kafka Topics
- `sensor.raw`       — raw readings from Pi (PM, temp, humidity, VOC)
- `system.health`    — device heartbeat / health events
- `aqi.computed`     — computed AQI results
- `alerts`           — threshold breach alerts

## Sensor Payload (sensor.raw)
```json
{
  "device_id": "string",
  "timestamp": "ISO8601",
  "pm1": 0.0,
  "pm25": 0.0,
  "pm4": 0.0,
  "pm10": 0.0,
  "temperature": 0.0,
  "humidity": 0.0,
  "voc": 0.0
}
```

## PostgreSQL Tables (to create via Alembic)
- `users`           — id, email, password_hash, is_admin, created_at
- `device_registry` — device_id (PK), auth_code, created_at, provisioned_by
- `ownership`       — id, device_id, user_id, nickname, created_at
- `sensor_readings` — id, device_id, timestamp, pm1, pm25, pm4, pm10, temperature, humidity, voc
- `aqi_results`     — id, device_id, timestamp, aqi, category, dominant_pollutant
- `alerts`          — id, device_id, timestamp, type, message, threshold, value, resolved

## Services (all Python, run as systemd units)
| Service              | Path                                  | Consumes        | Produces              | Status  |
|----------------------|---------------------------------------|-----------------|-----------------------|---------|
| Sensor Collector     | sensor/collector.py                   | SEN54 i2c       | sensor.raw            | TODO    |
| Storage Consumer     | services/storage_consumer/main.py     | sensor.raw      | PostgreSQL            | TODO    |
| Device Health        | services/device_health/main.py        | sensor.raw      | system.health         | TODO    |
| AQI Processor        | services/aqi_processor/main.py        | sensor.raw      | aqi.computed + PG     | TODO    |
| Alert Engine         | services/alert_engine/main.py         | aqi.computed    | alerts + PG           | TODO    |
| Notification Service | services/notification/main.py         | alerts          | email                 | TODO    |
| Dashboard API        | api/main.py                           | PostgreSQL+WS   | REST + WebSocket      | TODO    |

## Frontend Pages
- `/login`    — login + register
- `/dashboard` — live sensor cards, AQI gauge, charts per device
- `/devices`  — list owned devices, add device (device_id + auth_code), remove

## Project Structure
```
/home/raspberry/airwatch/
├── docker/
│   └── docker-compose.yml        ✅ DONE
├── sensor/
│   └── collector.py              TODO
├── services/
│   ├── storage_consumer/main.py  TODO
│   ├── device_health/main.py     TODO
│   ├── aqi_processor/main.py     TODO
│   ├── alert_engine/main.py      TODO
│   └── notification/main.py      TODO
├── api/
│   ├── main.py                   TODO
│   ├── database.py               TODO
│   ├── models/                   TODO
│   ├── schemas/                  TODO
│   └── routers/                  TODO
├── frontend/                     TODO
├── nginx/                        TODO
├── systemd/                      TODO
└── venv/                         ✅ DONE
```

## Environment / Secrets (to create at /home/raspberry/airwatch/.env)
```
DATABASE_URL=postgresql+asyncpg://airwatch:airwatch_secret@localhost:5432/airwatch
KAFKA_BOOTSTRAP=localhost:9092
SECRET_KEY=<generate with: openssl rand -hex 32>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=kMI0qcaXfg7FGSKwoDb_oH2r3tm7-U1BWQ1hvxhhK1KTk4QL0Il9Pl_YkXnS6AC9riurIeiunlx7DZnuxG3shw==
INFLUX_ORG=AirWatch
INFLUX_BUCKET=sen54
```

## Nginx Plan
- Port 80 → serve React frontend static files
- `/api/*` → proxy to FastAPI on port 8000
- `/ws/*`  → proxy WebSocket to FastAPI on port 8000

## Systemd Services to Create
- airwatch-sensor.service
- airwatch-storage.service
- airwatch-health.service
- airwatch-aqi.service
- airwatch-alerts.service
- airwatch-notify.service
- airwatch-api.service

## Resume Instructions
Tell Claude: "Resume AirWatch build — see /home/raspberry/airwatch/BUILD_PLAN.md"
The next step is: **write all Python service files starting with sensor/collector.py**

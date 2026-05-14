# AirWatch

Production-grade indoor air quality monitoring built on a Raspberry Pi 5 with a
Sensirion SEN54 sensor. Streams PM1/2.5/4/10, VOC, temperature, and humidity in
real time, computes US EPA AQI, fires email alerts, and exposes a full
React dashboard.

## Stack

- **Sensor**: Sensirion SEN54 over I²C, published every 2 s
- **Streaming**: Apache Kafka 3.7 (KRaft mode, in Docker)
- **Storage**: PostgreSQL (native, async via SQLAlchemy + asyncpg)
- **API**: FastAPI + WebSockets (JWT auth, bcrypt)
- **Frontend**: React 18 + TypeScript + Vite + Recharts
- **Microservices** (systemd units): sensor collector, storage consumer,
  device health watchdog, AQI processor, alert engine, notification sender
- **Email**: Resend.com
- **Tunnel**: Tailscale (no public exposure)

## Topology

```
SEN54 ──I²C──▶ sensor.collector ──┐
                                  │  Kafka topics
                                  ▼
       ┌─────────────┬────────────┬────────────┬────────────┐
       │ sensor.raw  │aqi.computed│ alerts     │system.health│
       └──────┬──────┴─────┬──────┴──────┬─────┴──────┬──────┘
              │            │             │            │
              ▼            ▼             ▼            ▼
       storage       aqi_processor   alert_engine   device_health
       consumer                          │
              │            │             ▼
              ▼            ▼          notification ──▶ Resend ──▶ email
         PostgreSQL ◀──── api  ◀── React dashboard
                            │
                         WebSocket fan-out to browsers
```

## Features

- Live dashboard with AQI gauge, sensor cards, recommendations
- Analytics (24h / 7d / 30d stats + CSV export)
- Alerts (history + custom threshold rules)
- Insights (auto-detected patterns, peak hours, week-over-week trends)
- History (365-day calendar heatmap)
- Forecast (48h outdoor AQI via Open-Meteo)
- Achievements (streaks, healthy days, milestones)
- Multi-device support
- Light/dark themes
- Mobile-responsive layout

## Local setup

1. `cp .env.example .env` and fill in real values.
2. Native Postgres with a `airwatch` database and `airwatch_app` user.
3. `python -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
4. `cd frontend && npm install && npm run build`
5. `docker compose -f docker/docker-compose.yml up -d` (Kafka)
6. `sudo systemctl start airwatch-api airwatch-sensor airwatch-storage airwatch-health airwatch-aqi airwatch-alerts airwatch-notify`
7. Visit `http://<pi>:8080`.

## License

Personal project.

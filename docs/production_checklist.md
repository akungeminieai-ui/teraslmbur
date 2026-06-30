# Teras Lmbur OS — Production Readiness Checklist

Ensure all foundational checklist steps are validated before deploying Teras Lmbur OS to production cloud instances.

---

## 1. Environment Configurations & Secrets

Verify that all environment settings are locked in Vercel (web) and Railway (api):
- [ ] `NODE_ENV` is set to `"production"`.
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are set to high-entropy 256-bit cryptographically secure values.
- [ ] CORS is configured strictly to allow only the production client domain: `CORS_ORIGIN="https://teraslmbur.com"`.
- [ ] `API_PORT` is resolved via production cloud provider port bindings.

---

## 2. Infrastructure & Databases

### PostgreSQL (Neon DB)
- [ ] Connect strictly via secure SSL configurations.
- [ ] Set up automated daily database dumps/backups with a minimum 30-day retention window.
- [ ] Setup Neon DB auto-scaling limits to avoid unexpected billing spikes.

### Redis (Upstash Redis)
- [ ] Ensure Redis server is configured with persistent storage enabled to prevent BullMQ job states loss on server restarts.
- [ ] Configure connection timeout limits for reliable remote network operations.

### Storage (Cloudflare R2)
- [ ] Configure bucket names and access credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).
- [ ] Bind custom storage domains to keep CDN request loading fast.
- [ ] Configure standard CORS rules to allow image fetches on client apps.

---

## 3. Monitoring, Logs, & Security

- [ ] Pino logger configuration: `pino-pretty` must be disabled in production to print clean, structured JSON payloads directly to standard log stream processors.
- [ ] Setup error tracking systems (e.g. Sentry) to trace runtime exceptions.
- [ ] Enable API rate limit protections to prevent script attacks or brute-force logins.
- [ ] Ensure standard security headers (Helmet, CSP, HSTS) are initialized on Express endpoints.
- [ ] Verify that all Prisma queries on high-traffic fields utilize the indexes defined in `schema.prisma`.

# Meridian CRM

A minimal, secure sales pipeline CRM built with Next.js, Drizzle ORM, and PostgreSQL. Designed for a dark, professional "mission control" aesthetic.

![Meridian Dashboard](./docs/dashboard-preview.png)

## Architecture

### Direct Vercel → Postgres Architecture

Meridian uses a **direct connection** architecture between Vercel's edge functions and your PostgreSQL database:

```
┌─────────────┐     TLS 1.3      ┌─────────────────┐
│   Vercel    │ ═══════════════► │  PostgreSQL     │
│  (Next.js)  │   (Encrypted)    │  (VPS/Cloud)    │
└─────────────┘                  └─────────────────┘
```

**Why direct instead of a gateway?**
- **Simpler infrastructure** - No additional hop between Vercel and database
- **Lower latency** - Direct TLS connection without proxy overhead
- **Edge-compatible** - Works with Vercel's edge runtime
- **Standard pattern** - Used by many production Next.js applications

**Security considerations:**
- All connections use TLS 1.3 encryption
- Database credentials stored in Vercel environment variables
- CSRF protection on all mutating requests
- Rate limiting on authentication endpoints

## VPS PostgreSQL Hardening

If hosting your own PostgreSQL on a VPS, follow these hardening steps:

### 1. Configure listen_addresses

Edit `postgresql.conf`:
```bash
sudo nano /etc/postgresql/16/main/postgresql.conf

# Set to specific IP or '*' for all (if using firewall)
listen_addresses = 'your.server.ip.address'

# Enable SSL
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
```

### 2. Configure pg_hba.conf for TLS-only

Edit `pg_hba.conf`:
```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Reject non-TLS connections
hostssl all             all             0.0.0.0/0               scram-sha-256
hostnossl all           all             0.0.0.0/0               reject
```

### 3. Firewall Configuration

```bash
# Allow PostgreSQL only from Vercel IP ranges (check Vercel docs for current IPs)
sudo ufw allow from <vercel-ip-range> to any port 5432

# Or use a more restrictive approach - allow specific IPs
sudo ufw allow from your.home.ip to any port 5432
```

### 4. Create Limited Database User

```sql
-- Create application-specific user
CREATE USER meridian WITH ENCRYPTED PASSWORD 'strong_random_password';

-- Grant only necessary permissions
GRANT CONNECT ON DATABASE meridian TO meridian;
GRANT USAGE ON SCHEMA public TO meridian;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO meridian;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO meridian;
```

### 5. Regular Updates

```bash
# Keep PostgreSQL updated
sudo apt update && sudo apt upgrade postgresql-16

# Enable automatic security updates
sudo apt install unattended-upgrades
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string with TLS | `postgres://user:pass@host:5432/db?sslmode=require` |
| `NEXTAUTH_SECRET` | Yes | Secret used to sign/verify NextAuth JWT sessions | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes (prod) | Canonical app URL for auth callbacks/cookies | `https://pipeline-brain.vercel.app` |
| `OPENCLAW_TOKEN` | Yes (for CLI scripts) | Token for internal script/API access | `secure_random_token_for_scripts` |
| `APP_URL` | Recommended | CORS allow-origin used by API middleware | `https://pipeline-brain.vercel.app` |
| `NODE_ENV` | No | Environment mode | `production` |

### Generating Secrets

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# OPENCLAW_TOKEN
openssl rand -hex 32
```

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd meridian
npm install
```

### 2. Database Setup

Create a PostgreSQL database and run migrations:

```bash
# Set your database URL
export DATABASE_URL="postgres://user:password@localhost:5432/meridian"

# Run migrations
npm run db:migrate
```

### 3. Seed Admin User

```bash
export DATABASE_URL="postgres://user:password@localhost:5432/meridian"
npm run db:seed
```

You'll be prompted to create an admin email and password.

### 4. Development

```bash
# Set required env vars
export DATABASE_URL="..."
export NEXTAUTH_SECRET="..."
export NEXTAUTH_URL="http://localhost:3000"
export OPENCLAW_TOKEN="..."

# Run dev server
npm run dev
```

### 5. Production Build

```bash
# Build for production
DATABASE_URL="dummy" NEXTAUTH_SECRET="dummy" npm run build

# The real DATABASE_URL and NEXTAUTH_SECRET are required at runtime
```

## Database Migrations

Using Drizzle Kit for migrations:

```bash
# Generate a new migration after schema changes
npm run db:generate

# Apply pending migrations
npm run db:migrate

# Open Drizzle Studio (GUI for database)
npm run db:studio
```

### Migration Commands Explained

```bash
# Generate migration files from schema changes
npx drizzle-kit generate

# Apply migrations to database
npx tsx drizzle/migrate.ts

# Push schema changes directly (dev only - destructive)
npx drizzle-kit push
```

## Backup Strategy

### Automated Backups with pg_dump

```bash
#!/bin/bash
# backup.sh - Run daily via cron

BACKUP_DIR="/var/backups/meridian"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="meridian"

# Create backup
pg_dump -Fc -Z9 $DB_NAME > "$BACKUP_DIR/backup_$DATE.dump"

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.dump" -mtime +30 -delete

# Optional: Upload to S3
# aws s3 cp "$BACKUP_DIR/backup_$DATE.dump" s3://your-bucket/backups/
```

Add to crontab:
```bash
# Daily at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/meridian-backup.log 2>&1
```

### Restore from Backup

```bash
# Drop and recreate database (careful!)
dropdb meridian
createdb meridian

# Restore from backup
pg_restore -d meridian backup_20240101_020000.dump
```

### Point-in-Time Recovery (if using WAL archiving)

Enable WAL archiving in `postgresql.conf`:
```conf
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
wal_level = replica
```

## OpenClaw Integration

Meridian includes CLI scripts for OpenClaw integration, allowing automated lead management from external sources.

### Setup

```bash
# Set environment variables for scripts
export OPENCLAW_TOKEN="your_internal_api_token"
export API_URL="https://your-app.vercel.app"  # or http://localhost:3000 for local
```

### CLI Commands

#### Create or Update Lead

```bash
# Create a new lead
OPENCLAW_TOKEN=xxx npx tsx scripts/create-or-update-lead.ts \
  --name "John Doe" \
  --email "john@example.com" \
  --company "Acme Inc" \
  --stage "New" \
  --value 50000 \
  --source "LinkedIn"

# Update existing lead (matched by email)
OPENCLAW_TOKEN=xxx npx tsx scripts/create-or-update-lead.ts \
  --name "John Doe" \
  --email "john@example.com" \
  --stage "Qualified"
```

#### Log a Touch

```bash
# Add a touch to a lead
OPENCLAW_TOKEN=xxx npx tsx scripts/log-touch.ts \
  --lead-id "uuid-here" \
  --channel "call" \
  --summary "Discussed requirements, sent proposal" \
  --nextAction "Follow up on proposal" \
  --nextActionAt "2024-01-15T10:00:00Z"
```

#### Get Due Leads

```bash
# List leads with actions due in next 7 days
OPENCLAW_TOKEN=xxx npx tsx scripts/get-due-leads.ts --days 7
```

### OpenClaw Skill Integration

Add to your OpenClaw skills to enable natural language lead management:

```typescript
// skill-example.ts
const API_URL = process.env.PIPELINE_BRAIN_URL;
const TOKEN = process.env.PIPELINE_BRAIN_TOKEN;

async function createLead(name: string, company?: string) {
  const response = await fetch(`${API_URL}/api/internal/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OPENCLAW-TOKEN': TOKEN!,
    },
    body: JSON.stringify({
      name,
      company,
      stage: 'New',
    }),
  });
  
  return response.json();
}
```

## Features

### Dashboard
- **Due This Week Panel** - Shows upcoming actions with color-coded urgency (red=overdue, amber=today, blue=upcoming)
- **Pipeline Stats** - Quick view of lead distribution across stages
- **Kanban Board** - Drag-and-drop lead management with 7 stages
- **Table View** - Sortable list view with all lead details
- **Dark Mission Control Theme** - Professional dark UI with stage color coding

### Lead Management
- Create, edit, and delete leads
- Track lead stage (New → Qualified → Call Scheduled → Proposal Sent → Negotiation → Won/Lost)
- Set deal values and next actions
- Full-text notes
- Drag cards between stages

### Touch Tracking
- Log interactions (email, call, text, DM, meeting, other)
- View chronological touch history
- Set follow-up actions when logging touches
- Automatic next action updates

### Security
- Session-based authentication with iron-session
- Argon2 password hashing
- CSRF protection on all mutations
- Rate limiting on auth endpoints
- Secure API tokens for CLI access

## Stage Colors

| Stage | Color | Hex |
|-------|-------|-----|
| New | Blue | `#3b82f6` |
| Qualified | Purple | `#8b5cf6` |
| Call_Scheduled | Amber | `#f59e0b` |
| Proposal_Sent | Pink | `#ec4899` |
| Negotiation | Orange | `#f97316` |
| Won | Emerald | `#10b981` |
| Lost | Gray | `#6b7280` |

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

**Required Environment Variables in Vercel:**
1. Go to Project Settings → Environment Variables
2. Add `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `OPENCLAW_TOKEN`, and `APP_URL`
3. Redeploy for changes to take effect

### Docker Deployment (Self-Hosted)

```dockerfile
# Dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/meridian
      - NEXTAUTH_SECRET=your_secret
      - NEXTAUTH_URL=http://localhost:3000
      - OPENCLAW_TOKEN=your_token
      - APP_URL=http://localhost:3000
    depends_on:
      - db
  
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=meridian
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
volumes:
  postgres_data:
```

## API Reference

### Authentication Endpoints
- `POST /api/auth/[...nextauth]` - NextAuth credentials callback/session routes
- `GET /api/auth/me` - Get current session
- `POST /api/auth/login` - Deprecated (returns 410)
- `POST /api/auth/logout` - Legacy logout endpoint

### Lead Endpoints
- `GET /api/leads` - List all leads (optionally filter by stage, search query)
- `POST /api/leads` - Create new lead
- `PATCH /api/leads/:id` - Update lead

### Touch Endpoints
- `GET /api/leads/:id` - Get lead with touches
- `POST /api/leads/:id/touches` - Add touch to lead

### Due Actions
- `GET /api/due?days=7` - Get leads with actions due in N days

### Internal API (CLI Access)
- `POST /api/internal/leads` - Create/update lead
- `POST /api/internal/leads/:id/touches` - Log touch
- `GET /api/internal/due?days=7` - Get due leads

All internal endpoints require `X-OPENCLAW-TOKEN` header.

## License

MIT License - See LICENSE file for details.

## Support

For issues and feature requests, please use GitHub Issues.

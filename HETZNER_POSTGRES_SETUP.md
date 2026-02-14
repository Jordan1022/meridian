# Pipeline Brain - Hetzner VPS PostgreSQL Setup Guide

Complete step-by-step guide to set up a secure PostgreSQL database on your Hetzner VPS for Pipeline Brain.

## Prerequisites

- Hetzner VPS running Ubuntu 22.04+ (or Debian)
- Root or sudo access
- Your VPS public IP address

## Step 1: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install PostgreSQL

```bash
# Install PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-contrib-16

# Enable and start service
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Verify it's running
sudo systemctl status postgresql
```

## Step 3: Configure PostgreSQL for External Access

### 3.1 Set postgres user password

```bash
sudo -u postgres psql -c "\password postgres"
# Enter a strong password (save this!)
```

### 3.2 Create pipeline_brain database and user

```bash
sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE pipeline_brain;

-- Create application user (NOT a superuser!)
CREATE USER pb_user WITH PASSWORD 'your_strong_random_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE pipeline_brain TO pb_user;

-- Connect to database and grant schema permissions
\c pipeline_brain
GRANT ALL ON SCHEMA public TO pb_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pb_user;

-- Verify
\du
\l
EOF
```

**Save these credentials securely:**
- Database: `pipeline_brain`
- User: `pb_user`
- Password: (what you entered)

### 3.3 Configure PostgreSQL for TLS and external connections

Edit the main configuration file:

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Make these changes (uncomment and modify):

```conf
# Connection Settings
listen_addresses = '*'                    # Allow connections from anywhere (firewall will restrict)
port = 5432

# SSL/TLS Settings (REQUIRED)
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
ssl_ca_file = ''                          # Optional: for client cert verification
ssl_crl_file = ''
ssl_ciphers = 'HIGH:!aNULL:!MD5'
ssl_prefer_server_ciphers = on

# Force SSL for all connections
ssl_min_protocol_version = 'TLSv1.2'

# Logging (for security monitoring)
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_connections = on
log_disconnections = on
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'                     # Log schema changes
log_min_messages = warning
```

### 3.4 Configure pg_hba.conf for authentication

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

**Replace the entire file** with this secure configuration:

```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections (Unix socket)
local   all             postgres                                peer
local   all             all                                     scram-sha-256

# IPv4 local connections (localhost only for maintenance)
hostssl pipeline_brain  pb_user         127.0.0.1/32            scram-sha-256
hostssl all             postgres        127.0.0.1/32            scram-sha-256

# IPv6 local connections
hostssl pipeline_brain  pb_user         ::1/128                 scram-sha-256
hostssl all             postgres        ::1/128                 scram-sha-256

# External connections - REQUIRE SSL + SCRAM authentication
# Allow from anywhere (firewall will control actual access)
hostssl pipeline_brain  pb_user         0.0.0.0/0               scram-sha-256
hostssl pipeline_brain  pb_user         ::/0                    scram-sha-256

# Reject all other connections
hostssl all             all             0.0.0.0/0               reject
hostssl all             all             ::/0                    reject
```

### 3.5 Generate self-signed SSL certificates (if not present)

```bash
# Check if certificates exist
ls -la /etc/ssl/certs/ssl-cert-snakeoil.pem

# If not, generate them
sudo apt install -y ssl-cert
sudo /usr/share/postgresql-common/ssl/ssl-cert-postgres.sh

# Set proper permissions
sudo chown postgres:postgres /etc/ssl/private/ssl-cert-snakeoil.key
sudo chmod 600 /etc/ssl/private/ssl-cert-snakeoil.key
```

### 3.6 Restart PostgreSQL

```bash
sudo systemctl restart postgresql

# Check for errors
sudo journalctl -u postgresql -n 50 --no-pager
```

## Step 4: Configure Firewall

### 4.1 Hetzner Cloud Firewall (Web Console)

**Recommended:** Use Hetzner's cloud firewall (not just UFW):

1. Go to [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Select your project → Firewalls → Create Firewall
3. Add these rules:

| Direction | Protocol | Port | Source | Description |
|-----------|----------|------|--------|-------------|
| In | TCP | 22 | Your IP only | SSH access |
| In | TCP | 5432 | 0.0.0.0/0 | PostgreSQL (we'll restrict via app) |

**Alternative: Restrict to specific IPs**
If you know your Vercel deployment region or use a VPN:
- Check Vercel's egress IPs for your region
- Or use a VPN/static IP for yourself

### 4.2 UFW (Uncomplicated Firewall) on VPS

```bash
# Install UFW if not present
sudo apt install -y ufw

# Default deny
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (essential!)
sudo ufw allow 22/tcp

# Allow PostgreSQL from anywhere (PostgreSQL auth will handle security)
# Or restrict to specific IP:
# sudo ufw allow from YOUR_IP to any port 5432
sudo ufw allow 5432/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

## Step 5: Test Connection

### 5.1 Local test

```bash
# Test local connection
sudo -u postgres psql -d pipeline_brain -c "SELECT version();"

# Test as pb_user
psql -h localhost -U pb_user -d pipeline_brain -c "SELECT current_user;"
```

### 5.2 Remote test (from your machine)

```bash
# Install psql client locally if needed
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql-client

# Test connection (replace with your VPS IP)
psql "postgresql://pb_user:your_password@vps_ip:5432/pipeline_brain?sslmode=require" -c "SELECT version();"
```

## Step 6: Database Connection URL for Vercel

Format your `DATABASE_URL`:

```
postgresql://pb_user:your_password@vps_ip:5432/pipeline_brain?sslmode=require
```

**Example:**
```
postgresql://pb_user:SuperSecret123!@123.456.789.012:5432/pipeline_brain?sslmode=require
```

## Step 7: Run Migrations

From your local machine (with the Pipeline Brain repo):

```bash
cd /home/jordan/.openclaw/workspace/pipeline-brain

# Set environment variable temporarily
export DATABASE_URL="postgresql://pb_user:your_password@vps_ip:5432/pipeline_brain?sslmode=require"

# Run migrations
npm run db:migrate
```

Or from the VPS:

```bash
cd /path/to/pipeline-brain
sudo -u postgres psql -d pipeline_brain -f drizzle/migrations/0000_initial.sql
```

## Step 8: Create Admin User

```bash
cd /home/jordan/.openclaw/workspace/pipeline-brain

export DATABASE_URL="postgresql://pb_user:your_password@vps_ip:5432/pipeline_brain?sslmode=require"
export BOOTSTRAP_EMAIL="your@email.com"
export BOOTSTRAP_PASSWORD="your_admin_password"
export OPENCLAW_TOKEN="$(openssl rand -hex 32)"

npx tsx scripts/seed-admin.ts
```

**Save the OPENCLAW_TOKEN** - you'll need it for CLI scripts.

## Step 9: Backup Strategy

### 9.1 Automated Backup Script

Create `/home/jordan/backup-pipeline.sh`:

```bash
#!/bin/bash
# Pipeline Brain Backup Script

BACKUP_DIR="/var/backups/pipeline-brain"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="pipeline_brain"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Run backup
pg_dump \
  --host=localhost \
  --username=pb_user \
  --dbname="$DB_NAME" \
  --format=custom \
  --file="$BACKUP_DIR/pipeline_brain_$DATE.dump"

# Compress
gzip "$BACKUP_DIR/pipeline_brain_$DATE.dump"

# Delete old backups (keep 30 days)
find "$BACKUP_DIR" -name "pipeline_brain_*.dump.gz" -mtime +$RETENTION_DAYS -delete

# Optional: Upload to S3/Backblaze
# aws s3 cp "$BACKUP_DIR/pipeline_brain_$DATE.dump.gz" s3://your-bucket/backups/

echo "Backup complete: pipeline_brain_$DATE.dump.gz"
```

Make executable and test:

```bash
chmod +x /home/jordan/backup-pipeline.sh
sudo /home/jordan/backup-pipeline.sh
```

### 9.2 Cron Job (Daily Backups)

```bash
# Edit crontab
sudo crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * /home/jordan/backup-pipeline.sh >> /var/log/pipeline-backup.log 2>&1
```

### 9.3 Manual Backup

```bash
# Quick manual backup
pg_dump -h localhost -U pb_user -d pipeline_brain | gzip > pipeline_brain_$(date +%Y%m%d).sql.gz
```

### 9.4 Restore from Backup

```bash
# Unzip and restore
gunzip < pipeline_brain_20240210.dump.gz | pg_restore -h localhost -U pb_user -d pipeline_brain --clean --if-exists
```

## Step 10: Monitoring & Security

### 10.1 Check Logs

```bash
# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log

# Auth failures (security monitoring)
sudo grep "authentication failed" /var/log/postgresql/*.log
```

### 10.2 Monitor Connections

```bash
# View active connections
sudo -u postgres psql -c "SELECT pid, usename, client_addr, state, query_start FROM pg_stat_activity;"

# View connection count by user
sudo -u postgres psql -c "SELECT usename, count(*) FROM pg_stat_activity GROUP BY usename;"
```

### 10.3 Install fail2ban (optional but recommended)

```bash
sudo apt install -y fail2ban

# Create PostgreSQL jail
sudo tee /etc/fail2ban/jail.local <<EOF
[postgresql]
enabled = true
port = 5432
filter = postgresql
logpath = /var/log/postgresql/postgresql-16-main.log
maxretry = 5
bantime = 3600
EOF

# Create filter
sudo tee /etc/fail2ban/filter.d/postgresql.conf <<EOF
[Definition]
failregex = .*\[\d+\].*FATAL:  password authentication failed for user.*client <HOST>
ignoreregex =
EOF

sudo systemctl restart fail2ban
sudo fail2ban-client status postgresql
```

## Troubleshooting

### Connection Refused

```bash
# Check if PostgreSQL is listening
sudo netstat -tlnp | grep 5432

# Check postgresql.conf
sudo grep "listen_addresses" /etc/postgresql/16/main/postgresql.conf

# Restart
sudo systemctl restart postgresql
```

### Authentication Failed

```bash
# Check pg_hba.conf syntax
sudo pg_ctlcluster 16 main reload

# View recent auth failures
sudo grep "authentication failed" /var/log/postgresql/*.log | tail -10
```

### SSL/TLS Issues

```bash
# Verify certificates exist
ls -la /etc/ssl/certs/ssl-cert-snakeoil.pem
ls -la /etc/ssl/private/ssl-cert-snakeoil.key

# Check permissions
sudo stat /etc/ssl/private/ssl-cert-snakeoil.key

# Test SSL connection
psql "postgresql://pb_user@localhost/pipeline_brain?sslmode=require" -c "SELECT 1;"
```

## Quick Reference

| Task | Command |
|------|---------|
| Restart PostgreSQL | `sudo systemctl restart postgresql` |
| Check status | `sudo systemctl status postgresql` |
| View logs | `sudo tail -f /var/log/postgresql/postgresql-16-main.log` |
| Connect as postgres | `sudo -u postgres psql` |
| Connect as pb_user | `psql -h localhost -U pb_user -d pipeline_brain` |
| List databases | `\l` |
| List tables | `\dt` |
| List users | `\du` |

## Security Checklist

- [ ] Strong random password for pb_user
- [ ] SSL/TLS enabled and required
- [ ] Firewall configured (UFW + Hetzner Cloud)
- [ ] pg_hba.conf restricts to scram-sha-256 only
- [ ] postgres superuser has strong password
- [ ] Database user is NOT a superuser
- [ ] Backups configured and tested
- [ ] Logs monitored for auth failures
- [ ] fail2ban installed (optional)

## Next Steps

1. Add environment variables to Vercel:
   ```
   DATABASE_URL=postgresql://pb_user:password@vps_ip:5432/pipeline_brain?sslmode=require
   SESSION_SECRET=$(openssl rand -base64 32)
   INTERNAL_API_TOKEN=$(openssl rand -hex 32)
   ```

2. Deploy to Vercel:
   ```bash
   cd /home/jordan/.openclaw/workspace/pipeline-brain
   vercel --prod
   ```

3. Test the app at your Vercel URL

4. Set up OpenClaw integration with the scripts in `/scripts/`

---

**Questions or issues?** Check the PostgreSQL logs first:
```bash
sudo tail -50 /var/log/postgresql/postgresql-16-main.log
```

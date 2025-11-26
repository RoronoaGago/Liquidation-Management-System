# Redis & WebSocket Setup Guide
## Liquidation Management System

This guide provides step-by-step instructions for setting up Redis and enabling WebSocket functionality in the Liquidation Management System.

## Prerequisites

- Windows 10/11 with WSL 2 installed
- Ubuntu distribution in WSL
- Python 3.8+ installed
- Node.js and npm installed

## Table of Contents

1. [WSL Setup](#wsl-setup)
2. [Redis Installation](#redis-installation)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Testing WebSocket Functionality](#testing-websocket-functionality)
6. [Troubleshooting](#troubleshooting)

---

## WSL Setup

### Step 1: Install WSL (if not already installed)

Open PowerShell as Administrator and run:

```powershell
wsl --install
```

Restart your computer after installation.

### Step 2: Set Up Ubuntu User

After restart, WSL will complete Ubuntu installation. Create your username and password when prompted.

### Step 3: Access WSL

Open PowerShell and run:

```powershell
wsl
```

You should see a prompt like: `username@DESKTOP-XXXXX:/mnt/c/...$`

---

## Redis Installation

### Step 1: Update Package Lists

```bash
sudo apt update
```

**Note:** If you see DNS resolution errors, they're usually temporary and won't affect Redis installation.

### Step 2: Install Redis Server

```bash
sudo apt install redis-server -y
```

### Step 3: Start Redis Service

```bash
# Start Redis service
sudo service redis-server start

# Enable Redis to start automatically on boot
sudo systemctl enable redis-server
```

### Step 4: Test Redis Installation

```bash
redis-cli ping
```

You should see `PONG` as the response.

### Step 5: Verify Redis Status

```bash
sudo service redis-server status
```

---

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd /mnt/c/Users/[YourUsername]/Desktop/Liquidation-Management-System/backend
```

### Step 2: Activate Virtual Environment

```bash
# Navigate to the virtual environment
cd proj_venv/Scripts

# Activate virtual environment (Windows)
activate

# Or if using WSL
source ../proj_venv/Scripts/activate
```

### Step 3: Install Python Dependencies

```bash
# Navigate back to backend directory
cd ../../

# Install requirements
pip install -r requirements.txt
```

### Step 4: Run Database Migrations

```bash
cd proj_backend
python manage.py makemigrations
python manage.py migrate
```

### Step 5: Start Django Server

```bash
python manage.py runserver
```

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory

Open a new terminal and run:

```bash
cd /mnt/c/Users/[YourUsername]/Desktop/Liquidation-Management-System/frontend
```

### Step 2: Install Node Dependencies

```bash
npm install
```

### Step 3: Start Frontend Development Server

```bash
npm run dev
```

---

## Testing WebSocket Functionality

### Step 1: Verify Redis is Running

In WSL terminal:

```bash
redis-cli ping
# Should return: PONG
```

### Step 2: Check WebSocket Connection

1. Open your browser and navigate to `http://localhost:5173` (or your frontend URL)
2. Open browser Developer Tools (F12)
3. Go to Console tab
4. Log into your application
5. Look for WebSocket connection messages in the console

### Step 3: Test Real-time Notifications

1. Create a new liquidation request
2. Check if notifications appear in real-time
3. Verify WebSocket connection status in browser console

---

## Using Batch Files (Windows)

### Step 1: Start Redis (WSL)

```bash
# In WSL terminal
sudo service redis-server start
```

### Step 2: Start Backend Services

Double-click the following batch files in order:

1. `VirtualEnvironment.bat` - Activates virtual environment
2. `start_celery_worker.bat` - Starts Celery worker
3. `start_celery_beat.bat` - Starts Celery beat scheduler
4. `start_celery_flower.bat` - Starts Flower monitoring (optional)

### Step 3: Start Django Server

```bash
cd backend/proj_backend
python manage.py runserver
```

### Step 4: Start Frontend

```bash
cd frontend
npm run dev
```

---

## Troubleshooting

### Redis Connection Issues

**Problem:** `redis-cli ping` returns connection refused

**Solution:**
```bash
# Check if Redis is running
sudo service redis-server status

# Start Redis if not running
sudo service redis-server start

# Check Redis configuration
sudo nano /etc/redis/redis.conf
```

### DNS Resolution Issues

**Problem:** `apt update` fails with DNS errors

**Solution:**
```bash
# Edit resolv.conf
sudo nano /etc/resolv.conf

# Add these nameservers:
nameserver 8.8.8.8
nameserver 8.8.4.4

# Make it permanent
sudo chattr +i /etc/resolv.conf
```

### WSL Password Issues

**Problem:** Forgot Ubuntu WSL password

**Solution:**
```bash
# From Windows PowerShell (as Administrator)
wsl.exe -u root

# In WSL root session
passwd [your-username]

# Exit root session
exit
```

### WebSocket Connection Issues

**Problem:** WebSocket not connecting

**Solutions:**
1. Verify Redis is running: `redis-cli ping`
2. Check Django server is running with ASGI support
3. Verify frontend is connecting to correct WebSocket URL
4. Check browser console for connection errors

### Port Conflicts

**Problem:** Port already in use

**Solutions:**
```bash
# Check what's using the port
sudo netstat -tulpn | grep :6379  # Redis
sudo netstat -tulpn | grep :8000  # Django
sudo netstat -tulpn | grep :5173  # Frontend

# Kill process if needed
sudo kill -9 [PID]
```

---

## Useful Commands

### Redis Commands

```bash
# Connect to Redis CLI
redis-cli

# Set a test key
set test "hello"

# Get the test key
get test

# List all keys
keys *

# Exit Redis CLI
exit

# Stop Redis
sudo service redis-server stop

# Start Redis
sudo service redis-server start

# Restart Redis
sudo service redis-server restart
```

### Django Commands

```bash
# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic

# Run tests
python manage.py test

# Check Django version
python -c "import django; print(django.get_version())"
```

### System Commands

```bash
# Check WSL version
wsl --version

# List WSL distributions
wsl --list --verbose

# Check Ubuntu version
lsb_release -a

# Check Python version
python --version

# Check Node version
node --version
npm --version
```

---

## Environment Variables

Make sure these environment variables are set in your `.env` file:

```env
# Redis Configuration
REDIS_URL=redis://127.0.0.1:6379/0

# WebSocket Configuration
VITE_WS_URL=ws://localhost:8000

# Django Settings
DEBUG=True
SECRET_KEY=your-secret-key-here
```

---

## File Structure

```
Liquidation-Management-System/
├── backend/
│   ├── proj_backend/
│   │   ├── api/
│   │   │   ├── routing.py          # WebSocket routing
│   │   │   ├── consumers.py        # WebSocket consumers
│   │   │   └── signals.py          # WebSocket notifications
│   │   ├── backend/
│   │   │   ├── settings.py         # Django settings
│   │   │   └── asgi.py            # ASGI configuration
│   │   └── manage.py
│   ├── requirements.txt
│   └── *.bat                       # Batch files for services
├── frontend/
│   ├── src/
│   │   ├── services/
│   │   │   └── websocketService.ts # WebSocket service
│   │   └── hooks/
│   │       └── useWebSocket.ts     # WebSocket hook
│   └── package.json
└── REDIS_WEBSOCKET_SETUP.md        # This file
```

---

## Support

If you encounter issues not covered in this guide:

1. Check the browser console for WebSocket errors
2. Verify all services are running (Redis, Django, Frontend)
3. Check network connectivity and firewall settings
4. Review Django logs for backend errors
5. Ensure all dependencies are properly installed

---

## Version Information

- **Redis Version:** 7.0.15 (compatible with channels-redis 4.1.0+)
- **Django Channels:** 4.0.0+
- **channels-redis:** 4.1.0+
- **Node.js:** 16.0+
- **Python:** 3.8+

---

*Last updated: January 2025*

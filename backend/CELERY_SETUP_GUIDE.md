# 🚀 Celery Setup Guide for Liquidation Management System

## 📋 Prerequisites

1. **Redis Server**: Must be running on `localhost:6379`
2. **Python Virtual Environment**: Activated
3. **Dependencies**: All packages installed

## 🔧 Installation Steps

### 1. Install Dependencies
```bash
cd backend
pip install -r ..\requirements.txt
```

### 2. Run Database Migrations
```bash
cd proj_backend
python manage.py migrate
```

### 3. Create Superuser (if needed)
```bash
python manage.py createsuperuser
```

## 🚀 Starting Celery Services

### Option 1: Start All Services (Recommended)
```bash
# Double-click or run:
start_all_celery.bat
```

This will start:
- ✅ Celery Worker (processes background tasks)
- ✅ Celery Beat (schedules tasks)
- ✅ Celery Flower (monitoring dashboard at http://localhost:5555)

### Option 2: Start Services Individually

#### Start Celery Worker
```bash
start_celery_worker.bat
```
Or manually:
```bash
cd proj_backend
celery -A backend worker --loglevel=info --concurrency=4
```

#### Start Celery Beat (Scheduler)
```bash
start_celery_beat.bat
```
Or manually:
```bash
cd proj_backend
celery -A backend beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

#### Start Celery Flower (Monitoring)
```bash
start_celery_flower.bat
```
Or manually:
```bash
cd proj_backend
celery -A backend flower --port=5555
```

## 📊 Monitoring & Management

### Celery Flower Dashboard
- **URL**: http://localhost:5555
- **Features**:
  - View active tasks
  - Monitor task history
  - Check worker status
  - View scheduled tasks

### Django Admin
- **URL**: http://localhost:8000/admin/
- **Features**:
  - Manage scheduled tasks
  - View task results
  - Monitor task execution

## ⚙️ Current Task Schedule

| Task | Schedule | Description |
|------|----------|-------------|
| `check_liquidation_reminders` | Daily at 8:00 AM | Sends liquidation reminders |
| `update_liquidation_remaining_days` | Daily at midnight | Updates remaining days |
| `process_advanced_requests` | Every minute | Processes advanced requests |
| `monthly_request_status_audit` | 1st of month at 2:00 AM | Monthly audit |

## 🔍 Troubleshooting

### Common Issues

1. **Redis Connection Error**
   ```
   Solution: Start Redis server
   Windows: Download Redis from https://github.com/microsoftarchive/redis/releases
   ```

2. **Task Not Executing**
   ```
   Check: Celery Beat is running
   Check: Task is properly scheduled
   Check: Worker is running
   ```

3. **Database Errors**
   ```
   Solution: Run migrations
   python manage.py migrate
   ```

### Checking Service Status

1. **Check if Redis is running**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. **Check Celery Worker**:
   ```bash
   celery -A backend inspect active
   ```

3. **Check Scheduled Tasks**:
   ```bash
   celery -A backend inspect scheduled
   ```

## 🎯 Production Deployment

### For Production Use:

1. **Use Process Manager** (like Supervisor or systemd)
2. **Configure Logging**:
   ```python
   CELERY_WORKER_LOG_FORMAT = '[%(asctime)s: %(levelname)s/%(processName)s] %(message)s'
   CELERY_WORKER_TASK_LOG_FORMAT = '[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s'
   ```

3. **Set Resource Limits**:
   ```python
   CELERY_WORKER_MAX_MEMORY_PER_CHILD = 200000  # 200MB
   CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
   ```

4. **Use Database Scheduler** (already configured):
   ```python
   CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
   ```

## 📈 Performance Optimization

### Current Configuration:
- **Concurrency**: 4 workers
- **Task Time Limit**: 30 minutes
- **Soft Time Limit**: 1 minute
- **Max Tasks Per Child**: 1000
- **Prefetch Multiplier**: 1

### Monitoring Commands:
```bash
# View active tasks
celery -A backend inspect active

# View scheduled tasks
celery -A backend inspect scheduled

# View worker stats
celery -A backend inspect stats

# View registered tasks
celery -A backend inspect registered
```

## ✅ Verification

To verify everything is working:

1. **Start all services**
2. **Check Flower dashboard**: http://localhost:5555
3. **Run test script**:
   ```bash
   python test_reminder_system.py
   ```
4. **Check Django admin**: http://localhost:8000/admin/

## 🎉 Success Indicators

- ✅ Redis server running
- ✅ Celery Worker processing tasks
- ✅ Celery Beat scheduling tasks
- ✅ Flower dashboard accessible
- ✅ Tasks executing on schedule
- ✅ WebSocket notifications working
- ✅ Email reminders being sent

Your liquidation reminder system is now fully operational! 🚀

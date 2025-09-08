# to get the Location
## pip install requests
## pip install pyyaml ua-parser user-agents
## pip install geoip2
## pip install django-simple-history 
#python manage.py migrate django_celery_results
#python manage.py migrate django_celery_beat
# Backend Setup Guide

This guide will walk you through the steps to set up and run the backend of this project.

---

### Database Setup

First, prepare your database and then add a sample user for testing.

1.  **Create Database in phpMyAdmin**
    Access your phpMyAdmin instance (or your preferred database management tool) and create a new database with the following name:

    ```
    db_liquidation_management_system
    ```

---

### Setup Steps

After setting up your database, follow these instructions to get your backend environment ready and the server running:

1.  **Navigate to the Backend Directory**
    First, ensure you are in the root directory of your project, then change into the `backend` directory:

    ```bash
    cd backend
    ```

2.  **Access the Virtual Environment**
    Navigate to the virtual environment directory:

    ```bash
    cd proj_venv
    ```

3.  **Go to Scripts Directory**
    Enter the `Scripts` directory where the activation script is located:

    ```bash
    cd Scripts
    ```

4.  **Activate the Virtual Environment**
    Activate the virtual environment. This is crucial for managing project dependencies:

    ```bash
    activate
    ```

5.  **Return to Backend Root**
    Go back to the main `backend` directory:

    ```bash
    cd ../..
    ```

6.  **Enter Project Backend Directory**
    Now, navigate into the core project backend directory:

    ```bash
    cd proj_backend
    ```

7.  **Make Migrations**
    Generate any new database migrations based on changes in your models:

    ```bash
    python manage.py makemigrations
    ```

8.  **Apply Migrations**
    Apply the generated migrations to update your database schema:

    ```bash
    python manage.py migrate
    ```

9.  **Run the Development Server**
    Start the development server. The backend will typically be accessible at `http://127.0.0.1:8000/` or a similar address:
    ```bash
    python manage.py runserver
    ```
10. **Create Sample User via API**
    Once your backend server is running, use an API testing tool like Thunder Client (or Postman, Insomnia, etc.) to create a new user by making a **POST** request to the following endpoint:

    **Endpoint:**


    ```
    http://127.0.0.1:8000/api/users/
    ```

    **Request Body (JSON):**
    Use the following JSON payload for the user data:

    ```json
    {
      "first_name": "John",
      "last_name": "Doe",
      "username": "johndoe",
      "password": "SecurePass123!",
      "date_of_birth": "1990-01-01",
      "email": "john.doe@example.com",
      "phone_number": "+1234567890",
      "role": "admin"
    }
    ```

---

You should now have the backend server up and running with a sample user created for testing!

CHECK NYO yung SQLFOLDER para sa mga datas na galing sa excel na binigay ng lusdo pero school palang nalagay ko hehe
we have 386 Schools at the moment



Django, Celery, and Redis Setup Guide
This guide provides step-by-step instructions to set up a development environment for a Django project using Celery for asynchronous tasks and Redis as the message broker.

The final setup requires running four separate processes in four terminals:

Redis Server

Celery Worker

Celery Beat (Scheduler)

Django Development Server

Step 1: Prerequisites (for Windows Users)
If you are on Windows, it is highly recommended to use the Windows Subsystem for Linux (WSL) to run Redis and Celery, as they are primarily designed for Linux environments.

Install WSL:
Open PowerShell as an administrator, run the following command, and then restart your machine.

bash
wsl --install
Set Up Your Linux User:
After your machine restarts, WSL will complete the installation of a Linux distribution (usually Ubuntu). You will be prompted to create a username and password for it. This is your Linux user, separate from your Windows login.

Step 2: Install Redis Server (inside WSL)
Once your WSL/Linux terminal is ready, you need to install the Redis server.

Update Package Lists:
bash
sudo apt-get update
Install Redis:
bash
sudo apt-get install redis-server
Verify the Installation:
You can check that Redis is running by connecting with the Redis CLI.

bash
redis-cli
Once connected, test the connection with the ping command. It should return PONG.

text
127.0.0.1:6379> ping
PONG
Type exit to quit the Redis CLI.

Step 3: Project and Virtual Environment Setup
Before running the application, set up your Python environment and install the required packages.

Clone Your Project:
Make sure you have your project code inside your WSL environment.

bash
# Example
git clone <your-repository-url>
cd /path/to/your/project
Create and Activate a Virtual Environment:
It's best practice to isolate your project dependencies.

bash
python3 -m venv venv
source venv/bin/activate
Your terminal prompt should now be prefixed with (venv).

Install Python Dependencies:
Install Django, Celery, and the Redis client library for Python.

bash
pip install django "celery[redis]"
(Or, if you have a requirements.txt file: pip install -r requirements.txt)

Make Migrations:
bash
python manage.py makemigrations
Apply Migrations:
Apply the generated migrations to update your database schema:

bash
python manage.py migrate
Step 4: Running the Development Environment
Open four separate WSL/Linux terminals and navigate to your project's root directory in each one. Remember to activate the virtual environment in each terminal (source venv/bin/activate).

Terminal 1: Start the Redis Server
This terminal will run the message broker.

bash
# Start the Redis server in the foreground
redis-server
Note: If Redis is already running as a background service (sudo service redis-server start), you can skip this step and use this terminal for something else.

Terminal 2: Start the Celery Worker
This terminal runs the Celery worker, which listens for and executes tasks from the queue.

bash
# Make sure you are in your project's root directory
# Replace 'api' with the name of your Django app where celery.py is located
celery -A api worker --loglevel=info --pool=solo
Terminal 3: Start the Celery Beat Scheduler
This terminal runs the Celery Beat scheduler, which sends scheduled tasks to the queue at their specified time.

bash
# Make sure you are in your project's root directory
# Replace 'api' with the name of your Django app where celery.py is located
celery -A api beat --loglevel=info
Terminal 4: Start the Django Server
This terminal runs your main Django application.

bash
# Make sure you are in your project's root directory
python manage.py runserver
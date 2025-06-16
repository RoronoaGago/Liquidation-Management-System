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

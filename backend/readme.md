# Backend Setup Guide

This guide will walk you through the steps to set up and run the backend of this project.

---

### Setup Steps

Follow these instructions to get your backend environment ready and the server running:

1.  **Navigate to the Backend Directory**
    First, ensure you're in the root directory of your project, then change into the `backend` directory:

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

---

You should now have the backend server up and running!

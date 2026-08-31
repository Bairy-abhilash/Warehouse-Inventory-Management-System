# Inventory & Warehouse Management System (Backend API)

An enterprise-grade, RESTful Backend API for Inventory and Warehouse Management built with **Python**, **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.0**, **Pydantic v2**, **Alembic**, and **JWT Authentication**.

---

##  Key Features

* **Clean Architecture:** Strictly decoupled Presentation (Routers), Data Validation (Schemas), Business Logic (Services), and Persistence (Models) layers.
* **Security & JWT Authentication:** Stateless JSON Web Token authentication with **Bcrypt** password hashing.
* **Role-Based Access Control (RBAC):** Granular, case-insensitive role permissions across **Admin**, **Manager**, and **Staff** roles.
* **Master Catalog Management:** Complete CRUD operations for Products, Categories, Warehouses, and Suppliers with unique SKU and name constraint enforcement.
* **Stock & Inventory Control:** Real-time multi-warehouse inventory tracking with stock level adjustment protection preventing negative quantities.
* **Purchase Order Lifecycle Engine:** Finite state machine managing Purchase Orders (`draft` → `submitted` → `approved` → `received`).
* **Automated Stock Receiving:** Receiving goods against approved POs automatically updates line item fulfillment, increments warehouse inventory levels, and auto-marks POs as received.
* **Real-time Analytics Dashboard:** Aggregate SQL metrics for total stock value, warehouse stock distributions, low-stock warnings, and pending order summaries.
* **Immutable Audit Logging:** Complete audit history recording actions (`CREATE`, `UPDATE`, `DELETE`, `RECEIVE_STOCK`, `ADJUST_STOCK`), user identity, entity references, and timestamps.
* **Production Practice & Health Monitoring:** Standardized JSON error response formatting, request logging middleware with latency timing, and an active database liveness health check (`GET /health`).
* **Automated Testing Suite:** Comprehensive automated test suite using **`pytest`** and in-memory SQLite with 100% test isolation.

---

##  System Architecture & Directory Structure

```text
backend/
├── app/
│   ├── main.py             # FastAPI entrypoint, middleware, and router registrations
│   ├── api/
│   │   └── deps.py         # Shared dependencies (JWT authentication, get_db, RBAC)
│   ├── core/               # Security, Config, Logging, Global Exception Handlers
│   ├── db/
│   │   └── session.py       # SQLAlchemy engine & session factory
│   ├── models/             # SQLAlchemy ORM database models (9 normalized tables)
│   ├── schemas/            # Pydantic v2 request/response validation schemas
│   ├── services/           # Business logic layer ( decoupled from HTTP framework )
│   └── routers/            # REST API controllers & endpoint definitions
├── alembic/                # Database version control and migration scripts
├── tests/                  # Automated pytest integration test suite
│   ├── conftest.py         # Pytest fixtures & in-memory test database setup
│   ├── test_auth.py
│   ├── test_products.py
│   ├── test_inventory.py
│   ├── test_purchase_orders.py
│   ├── test_audit_logs.py
│   └── test_dashboard.py
├── .env.example            # Template for environment configuration
├── requirements.txt        # Project Python dependencies
└── seed_dummy.sql          # SQL script for sample development seed data
```

---

##  Technology Stack

* **Language:** Python 3.10+
* **Web Framework:** FastAPI (0.115+)
* **ASGI Server:** Uvicorn
* **Database ORM:** SQLAlchemy 2.0
* **Database Engine:** PostgreSQL
* **Migrations:** Alembic
* **Data Validation:** Pydantic v2
* **Authentication:** JWT (`python-jose`) & Bcrypt
* **Testing:** Pytest & HTTPX

---

##  Quickstart & Local Setup Guide

### 1. Prerequisites
Ensure you have installed:
* Python 3.10+
* PostgreSQL service running locally or on a remote server

### 2. Clone the Repository & Setup Virtual Environment
```bash
git clone https://github.com/YOUR_USERNAME/inventory-management-backend.git
cd inventory-management-backend/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Mac/Linux:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the `backend/` root directory (refer to `.env.example`):
```env
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_PASSWORD@localhost:5432/inventory_db
SECRET_KEY=your-long-super-secret-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### 5. Run Database Migrations
Apply all schema migrations to your PostgreSQL database:
```bash
alembic upgrade head
```

### 6. (Optional) Seed Sample Data
Optionally import initial roles, admin/manager accounts, and categories:
```bash
psql -U postgres -d inventory_db -f seed_dummy.sql
```

### 7. Start the FastAPI Development Server
```bash
uvicorn app.main:app --reload
```
The server will start at `http://localhost:8000`.

---

##  Interactive API Documentation

Once the server is running, you can access interactive API documentation in your browser:
* **Swagger UI:** `http://localhost:8000/docs`
* **ReDoc:** `http://localhost:8000/redoc`

---

##  Running Automated Tests

Run the complete test suite using `pytest`:

```bash
python -m pytest -v
```

All 16+ integration and unit tests run in memory using an isolated SQLite test database without touching your PostgreSQL database.

---

##  Key API Endpoints Summary

| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | System & Database Liveness Probe | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue JWT token | Public |
| `POST` | `/api/v1/auth/register` | Register new user account | Public |
| `GET` | `/api/v1/products/` | List product catalog | Admin, Manager, Staff |
| `POST` | `/api/v1/products/` | Create new product | Admin, Manager |
| `POST` | `/api/v1/inventory/adjust` | Manual stock level correction | Admin, Manager |
| `POST` | `/api/v1/purchase-orders/` | Create new Purchase Order | Admin, Manager |
| `PATCH` | `/api/v1/purchase-orders/{id}/status` | Transition PO lifecycle state | Admin, Manager |
| `POST` | `/api/v1/purchase-orders/{id}/receive` | Receive goods into warehouse stock | Admin, Manager, Staff |
| `GET` | `/api/v1/dashboard/stats` | Fetch real-time inventory KPIs | Admin, Manager, Staff |
| `GET` | `/api/v1/audit-logs/` | View system audit trail logs | Admin, Manager |

---


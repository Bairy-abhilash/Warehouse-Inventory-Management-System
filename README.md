# Warehouse Inventory & Management System


## The Layered Architecture
```
┌─────────────────────────────────────────────────┐
│  CLIENT (React browser / Postman / mobile app)  │
│  "I want to see all products"                   │
└────────────────────┬────────────────────────────┘
                     │  HTTP request (JSON)
                     ▼
┌─────────────────────────────────────────────────┐
│  ROUTER LAYER  (FastAPI routes)                 │
│  - Receives the request at a specific URL       │
│  - Knows which function should handle it        │
│  - Does NOT contain business logic              │
└────────────────────┬────────────────────────────┘
                     │  validated data
                     ▼
┌─────────────────────────────────────────────────┐
│  SCHEMA LAYER  (Pydantic models)                │
│  - Validates: "is this email valid?"            │
│  - Validates: "is quantity a positive number?"  │
│  - Rejects bad data BEFORE it reaches logic     │
└────────────────────┬────────────────────────────┘
                     │  clean, validated data
                     ▼
┌─────────────────────────────────────────────────┐
│  SERVICE LAYER  (business logic)                │
│  - "You can't receive more stock than ordered"  │
│  - "Calculate the PO total"                     │
│  - Coordinates multiple operations              │
└────────────────────┬────────────────────────────┘
                     │  asks for/saves data
                     ▼
┌─────────────────────────────────────────────────┐
│  MODEL / DATABASE LAYER  (SQLAlchemy + Postgres)│
│  - Models = Python classes that map to tables   │
│  - Turns Python objects into SQL                │
│  - Talks to PostgreSQL                          │
└────────────────────┬────────────────────────────┘
                     │  SQL queries
                     ▼
┌─────────────────────────────────────────────────┐
│  PostgreSQL  (the actual database)              │
│  - Stores data permanently on disk              │
│  - Returns rows of data                         │
└─────────────────────────────────────────────────┘
```


## Summary of How a Request Flows
```
1. Browser sends: GET http://localhost:8000/api/v1/products
                  Authorization: Bearer eyJhbGci...

2. UVICORN (the server) receives the raw HTTP request over the network
   and passes it to FastAPI

3. FASTAPI looks at the URL + method and finds the matching router function
   "Ah, GET /api/v1/products → that's list_products()"

4. FASTAPI runs DEPENDENCIES first:
   - get_db() → opens a database session
   - get_current_user() → decodes the JWT, loads the user from DB

5. PYDANTIC validates any input (query parameters, request body)

6. The ROUTER FUNCTION calls the SERVICE LAYER:
   product_service.list_products(db, current_user)

7. The SERVICE uses SQLALCHEMY MODELS to query the database:
   db.query(Product).all()

8. SQLAlchemy translates that to SQL:
   SELECT * FROM products;

9. POSTGRESQL executes the SQL and returns rows

10. SQLAlchemy converts rows back into Python Product objects

11. PYDANTIC serializes the Python objects to JSON

12. FastAPI sends back: 200 OK + JSON array of products

13. Uvicorn sends the HTTP response over the network

14. React receives the JSON and renders it on screen
```
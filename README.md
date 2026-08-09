# Warehouse Inventory & Management System


# Mental model
┌────────────────────────────────────┐
│             REACT                  │
│          Presentation              │
│                                    │
│ Dashboard | Products | Inventory   │
└─────────────────┬──────────────────┘
                  │
                  │ HTTP + JSON
                  ↓
┌────────────────────────────────────┐
│             FASTAPI                │
│             API Layer              │
│                                    │
│ GET /products                      │
│ POST /products                     │
│ GET /inventory                     │
│ POST /purchase-orders              │
└─────────────────┬──────────────────┘
                  ↓
┌────────────────────────────────────┐
│         BUSINESS LOGIC             │
│                                    │
│ Product Service                    │
│ Inventory Service                  │
│ Purchase Order Service             │
│ Authentication                    │
│ Validation                         │
│ Authorization                      │
└─────────────────┬──────────────────┘
                  ↓
┌────────────────────────────────────┐
│            SQLALCHEMY              │
│               ORM                  │
│                                    │
│ Python Objects ↔ Database Tables   │
└─────────────────┬──────────────────┘
                  ↓
┌────────────────────────────────────┐
│           POSTGRESQL               │
│                                    │
│ Users                              │
│ Roles                              │
│ Products                           │
│ Categories                         │
│ Warehouses                         │
│ Suppliers                          │
│ Inventory                          │
│ Purchase Orders                    │
│ Purchase Order Items               │
│ Audit Logs                         │
└────────────────────────────────────┘
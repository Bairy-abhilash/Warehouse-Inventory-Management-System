# Warehouse Inventory & Management System


## Mental model
```
┌────────────────────────────────────┐
│              REACT                 │
│           Presentation             │
│ Dashboard | Products | Inventory   │
└─────────────────┬──────────────────┘
                  │ HTTP + JSON
                  ↓
┌────────────────────────────────────┐
│              FASTAPI               │
│             API Layer              │
│ GET /products | POST /products     │
│ GET /inventory | POST /purchase... │
└─────────────────┬──────────────────┘
                  │
                  ↓
┌────────────────────────────────────┐
│          BUSINESS LOGIC            │
│ Product | Inventory | Orders       │
│ Auth | Validation | Authorization  │
└─────────────────┬──────────────────┘
                  │
                  ↓
┌────────────────────────────────────┐
│          SQLALCHEMY  ORM           │
│   Python Objects <-> DB Tables     │
└─────────────────┬──────────────────┘
                  │
                  ↓
┌────────────────────────────────────┐
│             POSTGRESQL             │
│ Users | Roles | Products | Stock   │
│ Warehouses | Suppliers | Orders    |
| Audit Logs | Purchase Order Items  |
└────────────────────────────────────┘
```
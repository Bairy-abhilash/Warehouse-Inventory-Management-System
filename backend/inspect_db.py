"""
Database Inspector
==================

Run with:  python inspect_db.py

This connects to YOUR PostgreSQL database using SQLAlchemy's
"reflection" feature — it reads the existing schema directly from
PostgreSQL (without needing us to define models) and prints:

  - every table name
  - every column (name, type, whether it can be NULL, primary key?)
  - foreign keys (which columns point to which other tables)

We use this to understand the existing tables before writing models
that match them.
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect

load_dotenv()
DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(DATABASE_URL)
insp = inspect(engine)

table_names = insp.get_table_names()
print(f"\nFound {len(table_names)} table(s): {table_names}\n")

for table in table_names:
    print("=" * 60)
    print(f"TABLE: {table}")
    print("=" * 60)

    print(f"{'COLUMN':<25} {'TYPE':<25} {'NULL?':<7} {'PK?'}")
    print("-" * 60)
    for col in insp.get_columns(table):
        nullable = "YES" if col["nullable"] else "NO"
        pk = "◄ PK" if col.get("primary_key") else ""
        print(f"{col['name']:<25} {str(col['type']):<25} {nullable:<7} {pk}")

    fks = insp.get_foreign_keys(table)
    if fks:
        print("\n  FOREIGN KEYS:")
        for fk in fks:
            print(
                f"   - {fk['constrained_columns']} → "
                f"{fk['referred_table']}.{fk['referred_columns']}"
            )
    print()

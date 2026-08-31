"""
Database inspector — prints the real tables, columns, and foreign keys.

Run: python inspect_db.py
"""

from sqlalchemy import create_engine, inspect

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
insp = inspect(engine)

tables = insp.get_table_names()
print(f"\nFound {len(tables)} table(s): {tables}\n")

for table in tables:
    print("=" * 60)
    print(f"TABLE: {table}")
    print("=" * 60)
    print(f"{'COLUMN':<25} {'TYPE':<25} {'NULL?':<7} {'PK?'}")
    print("-" * 60)
    for col in insp.get_columns(table):
        nullable = "YES" if col["nullable"] else "NO"
        pk = "PK" if col.get("primary_key") else ""
        print(f"{col['name']:<25} {str(col['type']):<25} {nullable:<7} {pk}")

    fks = insp.get_foreign_keys(table)
    if fks:
        print("\n  FOREIGN KEYS:")
        for fk in fks:
            print(f"   - {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
    print()

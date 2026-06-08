import asyncio
from sqlalchemy import text
from app.utils.db_guard import get_database_url

get_database_url()
from app.database import engine

async def add_columns():
    async with engine.begin() as conn:
        print("Checking/Adding 'vt_file' column...")
        try:
            await conn.execute(text("ALTER TABLE tipos_deporte ADD COLUMN vt_file VARCHAR(255)"))
            print("Added 'vt_file'.")
        except Exception as e:
            print(f"Skipped 'vt_file' (probably exists): {e}")

        print("Checking/Adding 'logo_file' column...")
        try:
            await conn.execute(text("ALTER TABLE tipos_deporte ADD COLUMN logo_file VARCHAR(255)"))
            print("Added 'logo_file'.")
        except Exception as e:
            print(f"Skipped 'logo_file' (probably exists): {e}")

if __name__ == "__main__":
    asyncio.run(add_columns())

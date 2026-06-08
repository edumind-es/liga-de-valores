
import asyncio
import os
import sys

# Add parent dir to path to allow importing app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.db_guard import get_database_url
get_database_url()
from app.database import engine
from sqlalchemy import text

async def add_config_column():
    print("Adding 'config' column to 'ligas' table...")
    
    async with engine.begin() as conn:
        try:
            # Check if column exists
            result = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name='ligas' AND column_name='config'"
            ))
            if result.fetchone():
                print("Column 'config' already exists.")
            else:
                await conn.execute(text("ALTER TABLE ligas ADD COLUMN config JSON DEFAULT '{}'"))
                print("Column 'config' added successfully.")
                
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(add_config_column())

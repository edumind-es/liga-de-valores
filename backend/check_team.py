
import asyncio
import os
import sys

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.utils.db_guard import get_database_url
get_database_url()
from app.database import get_db, engine
from app.models import Equipo
from sqlalchemy import select

async def check_team():
    async with engine.connect() as conn:
        result = await conn.execute(select(Equipo).where(Equipo.id == 122))
        team = result.fetchone()
        if team:
            print(f"Team ID: {team.id}")
            print(f"Name: {team.nombre}")
            print(f"Logo Filename: {team.logo_filename}") # Check model for field name
            print(f"Logo URL: {team.logo_url}") # Check model for field name
        else:
            print("Team 122 not found")

if __name__ == "__main__":
    asyncio.run(check_team())

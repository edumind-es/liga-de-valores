import asyncio
import sys
import os

# Add the current directory to sys.path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.utils.db_guard import get_database_url
get_database_url()
from app.database import AsyncSessionLocal
from app.models import Equipo, User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        team_ids = [163, 164, 165, 166]
        query = select(Equipo).where(Equipo.id.in_(team_ids))
        result = await session.execute(query)
        teams = result.scalars().all()
        
        print(f"{'ID':<5} {'Name':<20} {'Logo Filename':<40} {'Logo URL':<40}")
        print("-" * 110)
        for team in teams:
            logo_f = str(team.logo_filename) if team.logo_filename else "None"
            logo_u = str(team.logo_url) if team.logo_url else "None"
            print(f"{team.id:<5} {team.nombre:<20} {team.liga_id:<5} {logo_f:<40} {logo_u:<40}")

        print("\n--- User 2 ---")
        user = await session.get(User, 2)
        if user:
            print(f"User 2: {user.email}")

        print("\n--- Teams in Liga 45 (Quinto A) ---")
        query_qa = select(Equipo).where(Equipo.liga_id == 45)
        result_qa = await session.execute(query_qa)
        teams_qa = result_qa.scalars().all()
        for team in teams_qa:
            logo_f = str(team.logo_filename) if team.logo_filename else "None"
            print(f"{team.id:<5} {team.nombre:<20} {logo_f:<40}")



if __name__ == "__main__":
    asyncio.run(main())

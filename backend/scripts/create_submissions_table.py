import asyncio
from app.utils.db_guard import get_database_url
from sqlalchemy import text

get_database_url()
from app.database import engine, Base
from app.models.game_submission import GameSubmission

async def create_table():
    async with engine.begin() as conn:
        print("Creating game_submissions table...")
        await conn.run_sync(GameSubmission.__table__.create)
        print("Table created successfully!")

if __name__ == "__main__":
    asyncio.run(create_table())

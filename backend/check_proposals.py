import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
from app.utils.db_guard import get_database_url

load_dotenv()
DATABASE_URL = get_database_url()

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Checking sport_proposals...")
        try:
            result = await conn.execute(text("SELECT id, nombre, status, tipo_marcador, descripcion, caracteristicas_adicionales FROM sport_proposals"))
            proposals = result.fetchall()
            for p in proposals:
                print(f"ID: {p[0]}, Name: {p[1]}, Status: {p[2]}, Type: {p[3]}, Desc: {p[4]}, Config: {p[5]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())

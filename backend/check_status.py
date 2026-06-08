
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.utils.db_guard import get_database_url

sys.path.append('/var/www/liga_edumind/backend')
DATABASE_URL = get_database_url()

async def check_submissions():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("--- Checking Users (Docentes) ---")
        # Check users table logic
        result = await conn.execute(text("SELECT id, codigo, email, is_superuser FROM users WHERE codigo LIKE '%luisvilela%' OR codigo LIKE '%lugas%' OR email LIKE '%luisvilela%'"))
        users = result.fetchall()
        for u in users:
            print(f"User Found: {u.codigo} | Email: {u.email} | Superuser: {u.is_superuser}")

        print("\n--- Checking Recent Game Submissions (Last 15) ---")
        # Check table name from model (usually snake_case of class name or __tablename__)
        # Assuming game_submissions based on file name, but let's be dynamic if possible or just try catch
        try:
             query = text("""
                SELECT id, title, liga_id, created_at, docente_email 
                FROM game_submissions 
                ORDER BY created_at DESC 
                LIMIT 15
             """)
             result = await conn.execute(query)
             submissions = result.fetchall()
             for s in submissions:
                 print(f"Submission ID: {s.id} | Title: {s.title} | Liga ID: {s.liga_id} | Time: {s.created_at} | Docente: {s.docente_email}")
        except Exception as e:
             print(f"Error querying game_submissions: {e}")
             print("Trying 'game_sheets'...")
             try:
                 query = text("SELECT * FROM game_sheets ORDER BY created_at DESC LIMIT 5")
                 result = await conn.execute(query)
                 print(result.fetchall())
             except Exception as e2:
                 print(f"Error enquering game_sheets: {e2}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_submissions())

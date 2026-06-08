import asyncio
import json
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.utils.db_guard import get_database_url

load_dotenv()
DATABASE_URL = get_database_url()

async def add_crossminton():
    print("Connecting to database...")
    engine = create_async_engine(DATABASE_URL)
    
    config = {
        "sets_para_ganar": 2,
        "puntos_por_set": 16,
        "diferencia_puntos": 2
    }
    config_json = json.dumps(config)
    
    # Description from the approved proposal
    description = "El crossminton es un deporte que surge en Alemania a inicios del siglo. Combina elementos del tenis, bádminton y squash. Cada jugador o jugadora defiende un cuadrado que se encuentra a una distancia de 12,8 del cuadrado de su rival. No hay red. Respecto a la puntuación, gana el jugador que se anote dos sets. Se juega un tercer set en el caso de que haya un empate inicial a un set. Para ganar el set se debe alcanzar los 16 puntos. Se juega a diferencia de dos puntos en el caso de que se produzca un empate a 15. Cada jugador o jugadora realiza tres saques en su turno."

    sql = text("""
        INSERT INTO tipos_deporte (nombre, codigo, tipo_marcador, permite_empate, config, descripcion, icono, created_at)
        VALUES (:nombre, :codigo, :tipo_marcador, :permite_empate, :config, :descripcion, :icono, NOW())
        ON CONFLICT (codigo) DO UPDATE SET
            config = EXCLUDED.config,
            descripcion = EXCLUDED.descripcion,
            tipo_marcador = EXCLUDED.tipo_marcador
        RETURNING id;
    """)

    async with engine.begin() as conn:
        try:
            result = await conn.execute(sql, {
                "nombre": "Crossminton",
                "codigo": "crossminton",
                "tipo_marcador": "sets",
                "permite_empate": False,  # Based on rules "gana el jugador que se anote dos sets", ties seem unlikely/handled by extra set
                "config": config_json,
                "descripcion": description,
                "icono": "🏸"
            })
            sport_id = result.scalar()
            print(f"Successfully added/updated Crossminton with ID: {sport_id}")
        except Exception as e:
            print(f"Error adding sport: {e}")

if __name__ == "__main__":
    asyncio.run(add_crossminton())

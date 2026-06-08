#!/usr/bin/env python3
"""
Script para asignar categorías a los deportes existentes.
Ejecutar: cd /var/www/liga_edumind/backend && source venv/bin/activate && python scripts/update_sport_categories.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.utils.db_guard import get_database_url

# Categorías de deportes
CATEGORIAS = {
    'convencional': [
        'futbol', 'baloncesto', 'voleibol', 'balonmano', 'badminton'
    ],
    'alternativo': [
        'colpball', 'rugby_tag', 'ultimate', 'kinball', 'floorball',
        'tchoukball', 'lacrosse', 'quadball', 'spikeball', 'rounders',
        'towertouchball', 'datchball', 'goubak', 'pinfuvote', 'jugger',
        'bijbol', 'rcs', 'keball', 'rosquilla', 'recicurling',
        'stikbomball', 'bottlebol', 'strabol_test', 'strabol', 'twincon',
        'ringol_v2', 'crossminton'
    ],
    'popular': [
        # Deportes adaptados/inclusivos
        'goalball', 'boccia', 'sitting_vball', 'wheelchair_bball',
        'futbol_5', 'futbol_7_pc', 'atletismo_adapt', 'vball_ciegos'
    ]
}


async def update_categories():
    # Cargar .env
    from dotenv import load_dotenv
    load_dotenv()
    
    database_url = get_database_url()
    
    print("Connecting to database...")
    engine = create_async_engine(database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        for categoria, codigos in CATEGORIAS.items():
            placeholders = ', '.join([f"'{c}'" for c in codigos])
            query = text(f"UPDATE tipos_deporte SET categoria = :cat WHERE codigo IN ({placeholders})")
            result = await db.execute(query, {'cat': categoria})
            print(f"Categoría '{categoria}': {result.rowcount} deportes actualizados")
        
        await db.commit()
        
        # Verificar
        result = await db.execute(text(
            "SELECT categoria, COUNT(*) as total FROM tipos_deporte GROUP BY categoria ORDER BY categoria"
        ))
        print("\n--- Resumen ---")
        for row in result.fetchall():
            print(f"  {row[0] or 'Sin categoría':15}: {row[1]} deportes")
    
    await engine.dispose()
    print("\n✅ Actualización completada")


if __name__ == "__main__":
    asyncio.run(update_categories())

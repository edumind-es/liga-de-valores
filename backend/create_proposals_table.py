#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
#


import asyncio
import os
import sys

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.utils.db_guard import get_database_url

get_database_url()
from app.database import engine

async def create_table():
    sql_table = """
    CREATE TABLE IF NOT EXISTS sport_proposals (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL,
        tipo_marcador VARCHAR(20) NOT NULL,
        descripcion TEXT CHECK (length(descripcion) >= 20),
        web_url VARCHAR(255),
        email_contacto VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        admin_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """
    sql_index = "CREATE INDEX IF NOT EXISTS idx_sport_proposals_status ON sport_proposals(status);"
    
    try:
        async with engine.begin() as conn:
            await conn.execute(text(sql_table))
            await conn.execute(text(sql_index))
        print("Table sport_proposals created successfully.")
    except Exception as e:
        print(f"Error creating table: {e}")

if __name__ == "__main__":
    asyncio.run(create_table())

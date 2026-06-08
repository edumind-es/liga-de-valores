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

import random
import string
from typing import Dict
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.services.student_code_generator import generar_codigo_estudiante
from app.utils.security import get_password_hash

async def create_random_user(db: AsyncSession) -> User:
    email = f"{random_string()}@example.com"
    password = "password123"
    codigo = generar_codigo_estudiante(1, 1, seed=random.randint(1, 10000))
    
    user = User(email=email, codigo=codigo, hashed_password=get_password_hash(password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def authentication_token_from_email(
    client: AsyncClient, email: str, db: AsyncSession
) -> Dict[str, str]:
    """
    Return a valid token for the user with given email.
    """
    # We need to find the user's code since login uses code
    # This helper assumes we know the password is 'password123'
    # In a real scenario we might need to query the user by email first
    from sqlalchemy import select
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise ValueError(f"User with email {email} not found")

    login_data = {
        "codigo": user.codigo,
        "password": "password123",
    }
    r = await client.post("/api/v1/auth/login", json=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}
    return headers

def random_string(length=10):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

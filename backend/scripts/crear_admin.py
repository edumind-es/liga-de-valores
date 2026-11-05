#
# Copyright (C) 2024-2026 Luis Vilela Acuña <contacto@edumind.es>
# Author: Luis Vilela Acuña
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#

"""
Crea un usuario administrador (superusuario) o promociona uno existente.

Uso (dentro del contenedor backend o con el entorno del backend activo):

    python scripts/crear_admin.py CODIGO [EMAIL]

La contraseña se pide por consola; también puede pasarse en la variable
de entorno ADMIN_PASSWORD (útil para instalaciones automatizadas).
Si el usuario con ese código ya existe, solo se le conceden permisos
de administrador.
"""
import asyncio
import getpass
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import User
from app.utils.security import get_password_hash


async def main() -> int:
    if len(sys.argv) < 2:
        print("Uso: python scripts/crear_admin.py CODIGO [EMAIL]")
        return 1

    codigo = sys.argv[1].strip()
    email = sys.argv[2].strip() if len(sys.argv) > 2 else None

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.codigo == codigo))
        user = result.scalar_one_or_none()

        if user:
            user.is_superuser = True
            user.is_active = True
            await session.commit()
            print(f"Usuario '{codigo}' promocionado a administrador.")
            return 0

        password = os.environ.get("ADMIN_PASSWORD") or getpass.getpass(
            f"Contraseña para el nuevo administrador '{codigo}': "
        )
        if len(password) < 8:
            print("La contraseña debe tener al menos 8 caracteres.")
            return 1

        user = User(
            codigo=codigo,
            email=email,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_superuser=True,
            email_verificado=True,
            acepta_privacidad=True,
            fecha_consentimiento=datetime.now(timezone.utc),
        )
        session.add(user)
        await session.commit()
        print(f"Administrador '{codigo}' creado correctamente.")
        return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

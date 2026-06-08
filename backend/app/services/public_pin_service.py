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

import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Liga


async def generate_unique_public_pin(
    db: AsyncSession,
    *,
    length: int = 6,
    exclude_liga_id: int | None = None,
    max_attempts: int = 50,
) -> str:
    digits = "0123456789"

    for _ in range(max_attempts):
        pin = "".join(secrets.choice(digits) for _ in range(length))
        query = select(Liga.id).where(Liga.public_pin == pin)
        if exclude_liga_id is not None:
            query = query.where(Liga.id != exclude_liga_id)

        existing = await db.scalar(query)
        if existing is None:
            return pin

    raise ValueError("No se pudo generar un PIN único, reintenta.")


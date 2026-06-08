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

"""Rename colpball to colpbol (correct spelling)

Revision ID: 013_rename_colpbol
Revises: 012_fix_colpbol
Create Date: 2026-01-14

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '013_rename_colpbol'
down_revision: Union[str, None] = '012_fix_colpbol'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename codigo from colpball to colpbol (correct spelling per sport creator)
    op.execute("""
        UPDATE tipos_deporte 
        SET codigo = 'colpbol'
        WHERE codigo = 'colpball'
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE tipos_deporte 
        SET codigo = 'colpball'
        WHERE codigo = 'colpbol'
    """)

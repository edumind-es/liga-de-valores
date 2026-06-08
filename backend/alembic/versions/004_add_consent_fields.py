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

"""Add GDPR consent fields to users table

Revision ID: 004_add_consent_fields
Revises: 003_float_grada_points
Create Date: 2025-12-15 08:16:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_add_consent_fields'
down_revision = '003_float_grada_points'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add GDPR consent tracking fields to users table."""
    # Add acepta_privacidad column
    op.add_column('users', sa.Column('acepta_privacidad', sa.Boolean(), 
                                      nullable=False, server_default='false'))
    
    # Add fecha_consentimiento column
    op.add_column('users', sa.Column('fecha_consentimiento', 
                                      sa.DateTime(timezone=True), nullable=True))
    
    # Add ip_consentimiento column
    op.add_column('users', sa.Column('ip_consentimiento', sa.String(length=45), 
                                      nullable=True))
    
    # For existing users, set acepta_privacidad to False (they will need to re-accept)
    # This is intentional for GDPR compliance


def downgrade() -> None:
    """Remove GDPR consent tracking fields from users table."""
    op.drop_column('users', 'ip_consentimiento')
    op.drop_column('users', 'fecha_consentimiento')
    op.drop_column('users', 'acepta_privacidad')

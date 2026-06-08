"""add email_enviado to game_submissions

Revision ID: 023_add_email_enviado
Revises: 022_public_pin_unique
Create Date: 2026-04-15 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '023_add_email_enviado'
down_revision: Union[str, None] = '022_public_pin_unique'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'game_submissions',
        sa.Column('email_enviado', sa.Boolean(), nullable=False, server_default='false')
    )
    op.add_column(
        'game_submissions',
        sa.Column('email_error', sa.String(length=500), nullable=True)
    )
    op.create_index('ix_game_submissions_email_enviado', 'game_submissions', ['email_enviado'])


def downgrade() -> None:
    op.drop_index('ix_game_submissions_email_enviado', table_name='game_submissions')
    op.drop_column('game_submissions', 'email_error')
    op.drop_column('game_submissions', 'email_enviado')

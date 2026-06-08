"""Add pending_actions table

Revision ID: 015_pending_actions
Revises: 014_fix_scoreboard_types
Create Date: 2026-02-08

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '015_pending_actions'
down_revision: Union[str, None] = '014_fix_scoreboard_types'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'pending_actions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('requester_id', sa.Integer(), nullable=True),
        sa.Column('liga_id', sa.Integer(), nullable=False),
        sa.Column('target_id', sa.Integer(), nullable=False),
        sa.Column('data_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewer_notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['liga_id'], ['ligas.id'], ),
        sa.ForeignKeyConstraint(['requester_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pending_actions_id'), 'pending_actions', ['id'], unique=False)
    op.create_index(op.f('ix_pending_actions_action_type'), 'pending_actions', ['action_type'], unique=False)
    op.create_index(op.f('ix_pending_actions_status'), 'pending_actions', ['status'], unique=False)
    op.create_index(op.f('ix_pending_actions_liga_id'), 'pending_actions', ['liga_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_pending_actions_liga_id'), table_name='pending_actions')
    op.drop_index(op.f('ix_pending_actions_status'), table_name='pending_actions')
    op.drop_index(op.f('ix_pending_actions_action_type'), table_name='pending_actions')
    op.drop_index(op.f('ix_pending_actions_id'), table_name='pending_actions')
    op.drop_table('pending_actions')

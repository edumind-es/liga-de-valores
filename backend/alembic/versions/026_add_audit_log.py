"""add audit log

Revision ID: 026_add_audit_log
Revises: 025_add_fases_finales
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

revision = '026_add_audit_log'
down_revision = '025_add_fases_finales'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'audit_log',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('action', sa.String(60), nullable=False, index=True),
        sa.Column('resource', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.Integer(), nullable=True),
        sa.Column('resource_name', sa.String(255), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
    )


def downgrade():
    op.drop_table('audit_log')

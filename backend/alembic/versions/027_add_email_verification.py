"""add email verification to users

Revision ID: 027_add_email_verification
Revises: 026_add_audit_log
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

revision = '027_add_email_verification'
down_revision = '026_add_audit_log'
branch_labels = None
depends_on = None


def upgrade():
    # email_verificado: True para usuarios existentes (no rompemos logins activos)
    op.add_column('users', sa.Column(
        'email_verificado',
        sa.Boolean(),
        nullable=False,
        server_default=sa.text('true'),
    ))
    # Token de verificación (JWT, se invalida al usarse → se pone a NULL)
    op.add_column('users', sa.Column(
        'email_verification_token',
        sa.String(500),
        nullable=True,
    ))
    op.create_index('ix_users_email_verificado', 'users', ['email_verificado'])


def downgrade():
    op.drop_index('ix_users_email_verificado', table_name='users')
    op.drop_column('users', 'email_verification_token')
    op.drop_column('users', 'email_verificado')

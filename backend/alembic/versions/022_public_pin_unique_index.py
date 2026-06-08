"""enforce unique public pin for ligas

Revision ID: 022_public_pin_unique
Revises: 021_submission_policy
Create Date: 2026-04-03 00:00:00.000000

"""

from typing import Sequence, Union
import secrets

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "022_public_pin_unique"
down_revision: Union[str, Sequence[str], None] = "021_submission_policy"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _generate_pin(existing: set[str], *, length: int = 6, max_attempts: int = 200) -> str:
    digits = "0123456789"
    for _ in range(max_attempts):
        pin = "".join(secrets.choice(digits) for _ in range(length))
        if pin not in existing:
            existing.add(pin)
            return pin
    raise RuntimeError("No se pudo regenerar un PIN público único durante la migración.")


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            "SELECT id, public_pin FROM ligas "
            "WHERE public_pin IS NOT NULL "
            "ORDER BY id ASC"
        )
    ).fetchall()

    seen: set[str] = set()
    for liga_id, public_pin in rows:
        if public_pin not in seen:
            seen.add(public_pin)
            continue

        new_pin = _generate_pin(seen)
        bind.execute(
            sa.text("UPDATE ligas SET public_pin = :pin WHERE id = :liga_id"),
            {"pin": new_pin, "liga_id": liga_id},
        )

    bind.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_ligas_public_pin_not_null "
            "ON ligas (public_pin) "
            "WHERE public_pin IS NOT NULL"
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(sa.text("DROP INDEX IF EXISTS ux_ligas_public_pin_not_null"))

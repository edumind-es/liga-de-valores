"""Merge pending_actions and sport proposal heads

Revision ID: 018_merge_pending_sport
Revises: 015_pending_actions, 017_sport_proposal_cfg
Create Date: 2026-02-20 17:45:00.000000

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "018_merge_pending_sport"
down_revision: Union[str, Sequence[str], None] = (
    "015_pending_actions",
    "017_sport_proposal_cfg",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Merge revision only: no schema/data operations.
    pass


def downgrade() -> None:
    # Split back into two heads (no schema/data operations).
    pass

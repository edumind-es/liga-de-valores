#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuna
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

from __future__ import annotations

from datetime import datetime, timezone
from typing import TypedDict

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Liga, User


class LeagueCapacity(TypedDict):
    plan_code: str
    plan_label: str
    leagues_limit: int | None
    leagues_used: int
    leagues_remaining: int | None
    can_create_league: bool
    grandfathered_unlimited: bool
    entitlement_source: str
    grandfathering_cutoff: datetime


PLAN_LABELS: dict[str, str] = {
    "free": "Free",
    "founding_teacher": "Founding Teacher",
    "school_plus": "School Plus",
    "school_pro": "School Pro",
    "enterprise": "Enterprise",
    "superuser": "Superuser",
}


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def get_grandfathering_cutoff() -> datetime:
    return _ensure_utc(settings.LEAGUE_GRANDFATHERING_CUTOFF)


def should_grant_grandfathering(created_at: datetime) -> bool:
    return _ensure_utc(created_at) <= get_grandfathering_cutoff()


def _is_user_grandfathered(user: User) -> bool:
    if user.grandfathered_unlimited:
        return True

    if not user.created_at:
        return False

    return should_grant_grandfathering(user.created_at)


def _resolve_plan_code(user: User, grandfathered: bool) -> str:
    if user.is_superuser:
        return "superuser"

    if grandfathered and user.plan_code in {None, "", "free", "founding_teacher"}:
        return "founding_teacher"

    return user.plan_code or "free"


def _resolve_plan_limit(user: User, plan_code: str, grandfathered: bool) -> tuple[int | None, str]:
    if user.is_superuser:
        return None, "superuser"

    if grandfathered:
        return None, "grandfathered"

    if user.plan_leagues_limit is not None:
        return max(0, int(user.plan_leagues_limit)), "plan_override"

    if plan_code == "free":
        return max(0, int(settings.FREE_PLAN_MAX_LEAGUES)), "plan"

    return None, "plan"


def _resolve_plan_label(plan_code: str) -> str:
    return PLAN_LABELS.get(plan_code, plan_code.replace("_", " ").title())


async def _get_leagues_used(db: AsyncSession, user_id: int) -> int:
    total = await db.scalar(
        select(func.count()).select_from(Liga).where(Liga.usuario_id == user_id)
    )
    return int(total or 0)


async def get_league_capacity(db: AsyncSession, user: User) -> LeagueCapacity:
    grandfathered = _is_user_grandfathered(user)
    plan_code = _resolve_plan_code(user, grandfathered)
    plan_label = _resolve_plan_label(plan_code)
    leagues_limit, entitlement_source = _resolve_plan_limit(user, plan_code, grandfathered)
    leagues_used = await _get_leagues_used(db, user.id)

    leagues_remaining: int | None
    can_create_league: bool

    if leagues_limit is None:
        leagues_remaining = None
        can_create_league = True
    else:
        leagues_remaining = max(0, leagues_limit - leagues_used)
        can_create_league = leagues_used < leagues_limit

    return {
        "plan_code": plan_code,
        "plan_label": plan_label,
        "leagues_limit": leagues_limit,
        "leagues_used": leagues_used,
        "leagues_remaining": leagues_remaining,
        "can_create_league": can_create_league,
        "grandfathered_unlimited": grandfathered,
        "entitlement_source": entitlement_source,
        "grandfathering_cutoff": get_grandfathering_cutoff(),
    }


async def ensure_can_create_league(db: AsyncSession, user: User) -> LeagueCapacity:
    capacity = await get_league_capacity(db, user)

    if capacity["can_create_league"]:
        return capacity

    leagues_limit = capacity["leagues_limit"]
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            f"Has alcanzado el limite de {leagues_limit} ligas para el plan gratuito. "
            "Actualiza tu plan o activa ligas adicionales para crear nuevas competiciones."
        ),
    )

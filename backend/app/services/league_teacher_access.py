"""
Servicio central de acceso docente a ligas.
"""
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Liga, User
from app.models.league_teacher_membership import LeagueTeacherMembership


VIEW_LEAGUE = "can_view_league"
VIEW_MATCHES = "can_view_matches"
OPEN_MATCHES = "can_open_matches"
VALIDATE_MATCHES = "can_validate_matches"
VIEW_RESULTS = "can_view_results"
MANAGE_MEMBERS = "can_manage_members"


PERMISSION_FIELDS = {
    VIEW_LEAGUE,
    VIEW_MATCHES,
    OPEN_MATCHES,
    VALIDATE_MATCHES,
    VIEW_RESULTS,
    MANAGE_MEMBERS,
}


ROLE_DEFAULTS = {
    "collaborator_teacher": {
        VIEW_LEAGUE: True,
        VIEW_MATCHES: True,
        OPEN_MATCHES: True,
        VALIDATE_MATCHES: True,
        VIEW_RESULTS: True,
        MANAGE_MEMBERS: False,
    },
    "substitute_teacher": {
        VIEW_LEAGUE: True,
        VIEW_MATCHES: True,
        OPEN_MATCHES: True,
        VALIDATE_MATCHES: True,
        VIEW_RESULTS: True,
        MANAGE_MEMBERS: False,
    },
    "viewer_teacher": {
        VIEW_LEAGUE: True,
        VIEW_MATCHES: True,
        OPEN_MATCHES: False,
        VALIDATE_MATCHES: False,
        VIEW_RESULTS: True,
        MANAGE_MEMBERS: False,
    },
}


async def get_active_membership(
    db: AsyncSession,
    *,
    liga_id: int,
    user_id: int,
) -> LeagueTeacherMembership | None:
    result = await db.execute(
        select(LeagueTeacherMembership).where(
            LeagueTeacherMembership.liga_id == liga_id,
            LeagueTeacherMembership.user_id == user_id,
            LeagueTeacherMembership.status == "active",
        )
    )
    return result.scalar_one_or_none()


async def has_liga_permission(
    db: AsyncSession,
    liga: Liga,
    user: User,
    permission: str,
) -> bool:
    if user.is_superuser or liga.usuario_id == user.id:
        return True
    if permission not in PERMISSION_FIELDS:
        return False
    membership = await get_active_membership(db, liga_id=liga.id, user_id=user.id)
    return bool(membership and getattr(membership, permission, False))


async def ensure_liga_permission(
    db: AsyncSession,
    liga: Liga | None,
    user: User,
    permission: str,
    *,
    not_found_detail: str = "Liga no encontrada",
    forbidden_detail: str = "No tienes permisos para acceder a esta liga",
) -> Liga:
    if liga is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=not_found_detail)
    if not await has_liga_permission(db, liga, user, permission):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=forbidden_detail)
    return liga


async def list_accessible_liga_ids(
    db: AsyncSession,
    user: User,
    permission: str = VIEW_LEAGUE,
) -> list[int] | None:
    """Devuelve IDs accesibles: ligas propias + teacher memberships activas.
    Superuser mantiene acceso admin pero ve solo sus ligas en el listado personal."""
    ids: set[int] = set()
    owned = await db.execute(select(Liga.id).where(Liga.usuario_id == user.id))
    ids.update(int(liga_id) for liga_id in owned.scalars().all())

    if permission in PERMISSION_FIELDS:
        membership_rows = await db.execute(
            select(LeagueTeacherMembership.liga_id).where(
                LeagueTeacherMembership.user_id == user.id,
                LeagueTeacherMembership.status == "active",
                getattr(LeagueTeacherMembership, permission) == True,
            )
        )
        ids.update(int(liga_id) for liga_id in membership_rows.scalars().all())

    return sorted(ids)


def apply_role_defaults(
    membership: LeagueTeacherMembership,
    role: str,
    overrides: dict[str, bool] | None = None,
) -> None:
    defaults = ROLE_DEFAULTS.get(role, ROLE_DEFAULTS["collaborator_teacher"])
    membership.role = role
    for field, value in defaults.items():
        setattr(membership, field, value)
    for field, value in (overrides or {}).items():
        if field in PERMISSION_FIELDS:
            setattr(membership, field, bool(value))


async def revoke_membership(
    membership: LeagueTeacherMembership,
    actor: User,
) -> None:
    membership.status = "revoked"
    membership.revoked_by = actor.id
    membership.revoked_at = datetime.now(timezone.utc)

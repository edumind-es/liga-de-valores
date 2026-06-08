#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuna
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#

"""
Domain services for configurable match role schemas.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Jornada, Liga, Partido, Equipo
from app.models.league_match_role_schema import (
    LeagueMatchRoleRule,
    LeagueMatchRoleSchema,
    LeagueMatchRoleSlot,
)
from app.schemas.liga import MatchRoleRuleInput, MatchRoleSchemaInput, MatchRoleSlotInput


SLOT_ORDER = {
    "home_team": 1,
    "away_team": 2,
    "slot_3": 3,
    "slot_4": 4,
    "slot_5": 5,
}

REQUIRED_SLOT_KEYS_BY_FORMAT = {
    3: ["home_team", "away_team", "slot_3"],
    4: ["home_team", "away_team", "slot_3", "slot_4"],
    5: ["home_team", "away_team", "slot_3", "slot_4", "slot_5"],
}

ROLE_CATALOG: dict[str, dict[str, str]] = {
    "equipo_local": {"label": "Equipo local", "category": "competitive"},
    "equipo_visitante": {"label": "Equipo visitante", "category": "competitive"},
    "arbitro": {"label": "Arbitro", "category": "arbitraje"},
    "grada_local": {"label": "Tutor de grada local", "category": "grada"},
    "grada_visitante": {"label": "Tutor de grada visitante", "category": "grada"},
    "staff_tecnico": {"label": "Staff tecnico", "category": "staff"},
    "staff_tecnico_local": {"label": "Staff tecnico local", "category": "staff"},
    "staff_tecnico_visitante": {"label": "Staff tecnico visitante", "category": "staff"},
    "cronometrista": {"label": "Cronometrista", "category": "staff"},
    "delegado": {"label": "Delegado", "category": "staff"},
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _required_slot_keys(roles_per_match: int) -> list[str]:
    try:
        return REQUIRED_SLOT_KEYS_BY_FORMAT[roles_per_match]
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="invalid_roles_per_match",
        ) from exc


def _default_slots(roles_per_match: int) -> list[dict[str, Any]]:
    canonical = [
        {"slot_key": "home_team", "role_code": "equipo_local", "is_required": True, "evaluation_enabled": True},
        {"slot_key": "away_team", "role_code": "equipo_visitante", "is_required": True, "evaluation_enabled": True},
        {"slot_key": "slot_3", "role_code": "arbitro", "is_required": True, "evaluation_enabled": True},
        {"slot_key": "slot_4", "role_code": "grada_local", "is_required": True, "evaluation_enabled": True},
        {"slot_key": "slot_5", "role_code": "grada_visitante", "is_required": True, "evaluation_enabled": True},
    ]
    needed = set(_required_slot_keys(roles_per_match))
    selected = [slot for slot in canonical if slot["slot_key"] in needed]
    return _normalize_slots(roles_per_match, selected)


def _normalize_slots(roles_per_match: int, raw_slots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    required_keys = _required_slot_keys(roles_per_match)
    by_key: dict[str, dict[str, Any]] = {}
    for item in raw_slots:
        slot_key = str(item.get("slot_key", "")).strip().lower()
        if not slot_key:
            raise HTTPException(status_code=422, detail="invalid_slot_substitution")
        if slot_key in by_key:
            raise HTTPException(status_code=422, detail="invalid_slot_substitution")
        by_key[slot_key] = item

    if sorted(by_key.keys()) != sorted(required_keys):
        raise HTTPException(status_code=422, detail="missing_required_slot")

    normalized: list[dict[str, Any]] = []
    used_role_codes: set[str] = set()
    for slot_key in required_keys:
        raw = by_key[slot_key]
        role_code = str(raw.get("role_code", "")).strip().lower()
        if not role_code:
            raise HTTPException(status_code=422, detail="invalid_slot_substitution")

        if slot_key == "home_team" and role_code != "equipo_local":
            raise HTTPException(status_code=422, detail="invalid_slot_substitution")
        if slot_key == "away_team" and role_code != "equipo_visitante":
            raise HTTPException(status_code=422, detail="invalid_slot_substitution")
        if slot_key in {"slot_3", "slot_4", "slot_5"} and role_code in {"equipo_local", "equipo_visitante"}:
            raise HTTPException(status_code=422, detail="invalid_slot_substitution")
        if role_code in used_role_codes:
            raise HTTPException(status_code=422, detail="invalid_slot_substitution")
        used_role_codes.add(role_code)

        catalog_meta = ROLE_CATALOG.get(role_code, {})
        role_label = str(raw.get("role_label") or catalog_meta.get("label") or role_code.replace("_", " ").title())
        scoring_category = str(raw.get("scoring_category") or catalog_meta.get("category") or "custom")

        normalized.append(
            {
                "slot_key": slot_key,
                "slot_order": SLOT_ORDER[slot_key],
                "role_code": role_code,
                "role_label": role_label,
                "scoring_category": scoring_category,
                "is_required": bool(raw.get("is_required", True)),
                "evaluation_enabled": bool(raw.get("evaluation_enabled", True)),
            }
        )
    return normalized


def _normalize_rules(
    raw_rules: list[dict[str, Any]] | None,
    slot_role_codes: set[str],
) -> list[dict[str, Any]]:
    if not raw_rules:
        return []

    normalized: list[dict[str, Any]] = []
    for raw in raw_rules:
        role_code = str(raw.get("role_code", "")).strip().lower()
        rule_code = str(raw.get("rule_code", "")).strip().lower()
        params_json = raw.get("params_json") or {}
        if not role_code or not rule_code or not isinstance(params_json, dict):
            raise HTTPException(status_code=422, detail="invalid_slot_substitution")
        if role_code not in slot_role_codes:
            raise HTTPException(status_code=422, detail="invalid_slot_substitution")
        normalized.append(
            {
                "role_code": role_code,
                "rule_code": rule_code,
                "params_json": params_json,
            }
        )

    return normalized


def normalize_match_role_schema_payload(payload: MatchRoleSchemaInput | None) -> dict[str, Any]:
    if payload is None:
        roles_per_match = 4
        slots = _default_slots(roles_per_match)
        return {"roles_per_match": roles_per_match, "slots": slots, "rules": []}

    roles_per_match = int(payload.roles_per_match)
    if payload.slots is None:
        slots = _default_slots(roles_per_match)
    else:
        raw_slots = [slot.model_dump() if isinstance(slot, MatchRoleSlotInput) else dict(slot) for slot in payload.slots]
        slots = _normalize_slots(roles_per_match, raw_slots)

    raw_rules = None
    if payload.rules is not None:
        raw_rules = [rule.model_dump() if isinstance(rule, MatchRoleRuleInput) else dict(rule) for rule in payload.rules]
    rules = _normalize_rules(raw_rules, {slot["role_code"] for slot in slots})

    return {"roles_per_match": roles_per_match, "slots": slots, "rules": rules}


async def _select_preferred_schema(db: AsyncSession, liga_id: int) -> LeagueMatchRoleSchema | None:
    result = await db.execute(
        select(LeagueMatchRoleSchema)
        .where(LeagueMatchRoleSchema.liga_id == liga_id)
        .options(
            selectinload(LeagueMatchRoleSchema.slots),
            selectinload(LeagueMatchRoleSchema.rules),
        )
        .execution_options(populate_existing=True)
        .order_by(LeagueMatchRoleSchema.version.desc(), LeagueMatchRoleSchema.id.desc())
    )
    schemas = list(result.scalars().all())
    if not schemas:
        return None

    locked = [schema for schema in schemas if schema.status == "locked"]
    if locked:
        return locked[0]

    draft = [schema for schema in schemas if schema.status == "draft"]
    if draft:
        return draft[0]

    return schemas[0]


async def _get_schema_by_id(db: AsyncSession, schema_id: int) -> LeagueMatchRoleSchema | None:
    result = await db.execute(
        select(LeagueMatchRoleSchema)
        .where(LeagueMatchRoleSchema.id == schema_id)
        .options(
            selectinload(LeagueMatchRoleSchema.slots),
            selectinload(LeagueMatchRoleSchema.rules),
        )
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def get_or_create_match_role_schema(
    db: AsyncSession,
    liga: Liga,
    *,
    create_if_missing: bool = True,
) -> LeagueMatchRoleSchema | None:
    schema = await _select_preferred_schema(db, liga.id)
    if schema or not create_if_missing:
        return schema

    teams_count = await db.scalar(
        select(func.count()).select_from(Equipo).where(Equipo.liga_id == liga.id)
    )
    if (teams_count or 0) >= 5:
        inferred_roles_per_match = 5
    elif (teams_count or 0) >= 4:
        inferred_roles_per_match = 4
    else:
        inferred_roles_per_match = 3

    payload = normalize_match_role_schema_payload(MatchRoleSchemaInput(roles_per_match=inferred_roles_per_match))
    schema = LeagueMatchRoleSchema(
        liga_id=liga.id,
        version=1,
        roles_per_match=payload["roles_per_match"],
        status="draft",
    )
    for slot in payload["slots"]:
        schema.slots.append(LeagueMatchRoleSlot(**slot))
    for rule in payload["rules"]:
        schema.rules.append(LeagueMatchRoleRule(**rule))

    db.add(schema)
    await db.flush()
    return schema


async def league_has_structural_activity(db: AsyncSession, liga_id: int) -> bool:
    jornadas_count = await db.scalar(
        select(func.count()).select_from(Jornada).where(Jornada.liga_id == liga_id)
    )
    if (jornadas_count or 0) > 0:
        return True

    partidos_count = await db.scalar(
        select(func.count()).select_from(Partido).where(Partido.liga_id == liga_id)
    )
    return (partidos_count or 0) > 0


async def maybe_auto_lock_schema(db: AsyncSession, liga: Liga) -> LeagueMatchRoleSchema:
    schema = await get_or_create_match_role_schema(db, liga, create_if_missing=True)
    if schema is None:
        raise HTTPException(status_code=500, detail="schema_not_available")

    if schema.status == "locked":
        return schema

    has_activity = await league_has_structural_activity(db, liga.id)
    if has_activity:
        schema.status = "locked"
        schema.locked_at = _utcnow()
        await db.flush()

    return schema


async def force_lock_schema(db: AsyncSession, liga: Liga) -> LeagueMatchRoleSchema:
    schema = await get_or_create_match_role_schema(db, liga, create_if_missing=True)
    if schema is None:
        raise HTTPException(status_code=500, detail="schema_not_available")

    if schema.status != "locked":
        schema.status = "locked"
        schema.locked_at = _utcnow()
        await db.flush()
    return schema


async def update_schema_in_draft(
    db: AsyncSession,
    liga: Liga,
    payload: MatchRoleSchemaInput,
) -> LeagueMatchRoleSchema:
    schema = await get_or_create_match_role_schema(db, liga, create_if_missing=True)
    if schema is None:
        raise HTTPException(status_code=500, detail="schema_not_available")

    if schema.status == "locked":
        raise HTTPException(status_code=409, detail="schema_locked")

    if await league_has_structural_activity(db, liga.id):
        schema.status = "locked"
        schema.locked_at = _utcnow()
        await db.flush()
        raise HTTPException(status_code=409, detail="schema_locked")

    normalized = normalize_match_role_schema_payload(payload)
    schema.roles_per_match = normalized["roles_per_match"]
    await db.execute(
        delete(LeagueMatchRoleSlot).where(LeagueMatchRoleSlot.schema_id == schema.id)
    )
    await db.execute(
        delete(LeagueMatchRoleRule).where(LeagueMatchRoleRule.schema_id == schema.id)
    )

    for slot in normalized["slots"]:
        db.add(LeagueMatchRoleSlot(schema_id=schema.id, **slot))
    for rule in normalized["rules"]:
        db.add(LeagueMatchRoleRule(schema_id=schema.id, **rule))

    await db.flush()
    refreshed = await _get_schema_by_id(db, schema.id)
    if refreshed is None:
        raise HTTPException(status_code=500, detail="schema_not_available")
    return refreshed

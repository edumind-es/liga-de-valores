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
Models for configurable match role schemas per league.
"""
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class LeagueMatchRoleSchema(Base):
    """Versioned match-role schema configured per league."""

    __tablename__ = "league_match_role_schema"

    id = Column(Integer, primary_key=True, index=True)
    liga_id = Column(Integer, ForeignKey("ligas.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    roles_per_match = Column(Integer, nullable=False, default=5)
    status = Column(String(20), nullable=False, default="draft")  # draft|locked|deprecated
    locked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    liga = relationship("Liga", back_populates="match_role_schemas")
    slots = relationship(
        "LeagueMatchRoleSlot",
        back_populates="schema",
        cascade="all, delete-orphan",
        order_by="LeagueMatchRoleSlot.slot_order",
    )
    rules = relationship(
        "LeagueMatchRoleRule",
        back_populates="schema",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<LeagueMatchRoleSchema(id={self.id}, liga_id={self.liga_id}, status={self.status})>"


class LeagueMatchRoleSlot(Base):
    """Role assignment for each stable slot in a schema."""

    __tablename__ = "league_match_role_slot"

    __table_args__ = (
        UniqueConstraint("schema_id", "slot_key", name="uq_lmrs_slot_key"),
        UniqueConstraint("schema_id", "slot_order", name="uq_lmrs_slot_order"),
    )

    id = Column(Integer, primary_key=True, index=True)
    schema_id = Column(Integer, ForeignKey("league_match_role_schema.id", ondelete="CASCADE"), nullable=False, index=True)
    slot_key = Column(String(20), nullable=False)
    slot_order = Column(Integer, nullable=False)
    role_code = Column(String(64), nullable=False)
    role_label = Column(String(120), nullable=False)
    scoring_category = Column(String(32), nullable=False, default="custom")
    is_required = Column(Boolean, nullable=False, default=True)
    evaluation_enabled = Column(Boolean, nullable=False, default=True)

    schema = relationship("LeagueMatchRoleSchema", back_populates="slots")

    def __repr__(self):
        return f"<LeagueMatchRoleSlot(schema_id={self.schema_id}, slot_key={self.slot_key}, role_code={self.role_code})>"


class LeagueMatchRoleRule(Base):
    """Scoring rule metadata linked to a schema role."""

    __tablename__ = "league_match_role_rule"

    id = Column(Integer, primary_key=True, index=True)
    schema_id = Column(Integer, ForeignKey("league_match_role_schema.id", ondelete="CASCADE"), nullable=False, index=True)
    role_code = Column(String(64), nullable=False)
    rule_code = Column(String(64), nullable=False)
    params_json = Column(JSON, nullable=False, server_default="{}")

    schema = relationship("LeagueMatchRoleSchema", back_populates="rules")

    def __repr__(self):
        return f"<LeagueMatchRoleRule(schema_id={self.schema_id}, role_code={self.role_code}, rule_code={self.rule_code})>"

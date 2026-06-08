#
# Copyright (C) 2024-2025 EDUmind - Los Mundos Edufis
# Author: Luis Vilela Acuña
#
# SPDX-License-Identifier: AGPL-3.0-or-later

"""
Modelo LeagueTeacherMembership — docentes adicionales asociados a una liga.
"""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class LeagueTeacherMembership(Base):
    """Permisos delegados de un docente sobre una liga concreta."""

    __tablename__ = "league_teacher_memberships"
    __table_args__ = (
        UniqueConstraint("liga_id", "user_id", name="uq_league_teacher_memberships_liga_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    liga_id = Column(Integer, ForeignKey("ligas.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(40), nullable=False, default="collaborator_teacher", server_default="collaborator_teacher")
    status = Column(String(20), nullable=False, default="active", server_default="active", index=True)

    can_view_league = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    can_view_matches = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    can_open_matches = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    can_validate_matches = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    can_view_results = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    can_manage_members = Column(Boolean, nullable=False, default=False, server_default=text("false"))

    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    revoked_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    liga = relationship("Liga", back_populates="teacher_memberships")
    user = relationship("User", foreign_keys=[user_id], back_populates="league_memberships")
    creator = relationship("User", foreign_keys=[created_by])
    revoker = relationship("User", foreign_keys=[revoked_by])

    def __repr__(self):
        return (
            f"<LeagueTeacherMembership(id={self.id}, liga_id={self.liga_id}, "
            f"user_id={self.user_id}, role='{self.role}', status='{self.status}')>"
        )

"""
Schemas para docentes asociados a una liga.
"""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


class LeagueTeacherPermissions(BaseModel):
    can_view_league: bool | None = None
    can_view_matches: bool | None = None
    can_open_matches: bool | None = None
    can_validate_matches: bool | None = None
    can_view_results: bool | None = None
    can_manage_members: bool | None = None

    def explicit_values(self) -> dict[str, bool]:
        return {key: value for key, value in self.model_dump(exclude_none=True).items()}


class LeagueTeacherMemberUpsert(BaseModel):
    user_id: int | None = Field(None, description="Usuario docente existente")
    email: EmailStr | None = Field(None, description="Email de un usuario docente existente")
    role: str = Field("collaborator_teacher", max_length=40)
    permissions: LeagueTeacherPermissions | None = None

    @model_validator(mode="after")
    def require_user_reference(self):
        if self.user_id is None and self.email is None:
            raise ValueError("Indica user_id o email")
        return self


class LeagueTeacherMemberResponse(BaseModel):
    id: int
    liga_id: int
    user_id: int
    user_codigo: str | None = None
    user_email: str | None = None
    role: str
    status: str
    can_view_league: bool
    can_view_matches: bool
    can_open_matches: bool
    can_validate_matches: bool
    can_view_results: bool
    can_manage_members: bool
    created_by: int | None = None
    revoked_by: int | None = None
    created_at: datetime
    updated_at: datetime | None = None
    revoked_at: datetime | None = None

    class Config:
        from_attributes = True

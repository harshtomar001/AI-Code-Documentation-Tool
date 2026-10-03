from pydantic import BaseModel, Field
from uuid import UUID

class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    source_type: str = Field(default="github", max_length=20)
    github_owner: str | None = Field(default=None, max_length=255)
    github_repo: str | None = Field(default=None, max_length=255)
    github_url: str | None = Field(default=None, max_length=500)
    local_storage_path: str | None = Field(default=None, max_length=500)
    language: str | None = Field(default=None, max_length=100)
    status: str = Field(default="created", max_length=30)
    documentation_progress: int = Field(default=0, ge=0, le=100)


class ProjectResponse(BaseModel):
    id: UUID
    user_id: int
    name: str
    description: str | None
    source_type: str
    github_owner: str | None
    github_repo: str | None
    github_url: str | None
    local_storage_path: str | None
    language: str | None
    status: str
    documentation_progress: int
    created_at: str
    updated_at: str

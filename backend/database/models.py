from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from database.database import Base

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID,JSONB
from uuid import UUID as PyUUID, uuid4

# =========================================================
# USER
# =========================================================

class User(Base):
    __tablename__ = "users"
    github_connection = relationship(
        "GitHubConnection",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# =========================================================
# USER IDENTITY
# =========================================================

class UserIdentity(Base):
    __tablename__ = "user_identities"

    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_id",
            name="uq_user_identity_provider_provider_id",
        ),
        UniqueConstraint(
            "user_id",
            "provider",
            name="uq_user_identity_user_provider",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    provider: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    provider_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# =========================================================
# OTP VERIFICATION
# =========================================================

class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    otp_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    purpose: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    attempts: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )

    is_used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

class GitHubConnection(Base):
    __tablename__ = "github_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    github_user_id = Column(String, nullable=False)
    github_username = Column(String, nullable=False)

    access_token = Column(Text, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    user = relationship("User", back_populates="github_connection")



# =========================================================
# PROJECT
# =========================================================

class Project(Base):
    __tablename__ = "projects"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    source_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    github_owner: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    github_repo: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    github_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    local_storage_path: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    language: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="created",
    )

    documentation_progress: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    documentation_runs = relationship(
        "DocumentationRun",
        back_populates="project",
        cascade="all, delete-orphan",
    )



# =========================================================
# DOCUMENTATION RUN
# =========================================================

class DocumentationRun(Base):
    __tablename__ = "documentation_runs"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        index=True,
    )

    project_id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "projects.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    docstrings_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    comments_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    readme_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    functions_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    classes_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    methods_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    modules_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    project = relationship(
        "Project",
        back_populates="documentation_runs",
    )

# =========================================================
# DOCUMENTATION BATCH
# =========================================================

class DocumentationBatch(Base):
    __tablename__ = "documentation_batches"

    id: Mapped[PyUUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        index=True,
    )

    job_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    project_id: Mapped[PyUUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "projects.id",
            ondelete="CASCADE",
        ),
        nullable=True,
        index=True,
    )

    batch_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    total_batches: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="completed",
    )

    files: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    changes: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    readme: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "job_id",
            "batch_id",
            name="uq_documentation_batch_job_batch",
        ),
    )

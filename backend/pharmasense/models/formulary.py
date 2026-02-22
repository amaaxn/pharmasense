import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class FormularyEntry(Base):
    __tablename__ = "formulary_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drug_name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    generic_name: Mapped[str] = mapped_column(String(200), nullable=False)
    tier: Mapped[int] = mapped_column(Integer, nullable=False)
    copay_min: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")
    copay_max: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")
    requires_prior_auth: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_covered: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<FormularyEntry {self.drug_name} tier={self.tier}>"

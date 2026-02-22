import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class FormularyEntry(Base):
    """Formulary entry — one row per (plan_name, medication_name) pair (§7.3)."""

    __tablename__ = "formulary_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_name: Mapped[str] = mapped_column(String(200), nullable=False, server_default="", index=True)
    medication_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    generic_name: Mapped[str] = mapped_column(String(200), nullable=False, server_default="")
    tier: Mapped[int] = mapped_column(Integer, nullable=False)
    copay: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, server_default="0")
    covered: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    prior_auth_required: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    quantity_limit: Mapped[str] = mapped_column(String(200), nullable=False, server_default="")
    step_therapy_required: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    alternatives_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<FormularyEntry {self.medication_name} plan={self.plan_name} tier={self.tier}>"

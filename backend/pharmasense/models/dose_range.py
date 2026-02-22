import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class DoseRange(Base):
    __tablename__ = "dose_ranges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medication_name: Mapped[str] = mapped_column(String(200), nullable=False)
    min_dose_mg: Mapped[float] = mapped_column(Float, nullable=False)
    max_dose_mg: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(20), nullable=False, server_default="mg")
    frequency: Mapped[str] = mapped_column(String(50), nullable=False, server_default="once daily")
    population: Mapped[str] = mapped_column(String(50), nullable=False, server_default="adult")
    source: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<DoseRange {self.medication_name} {self.min_dose_mg}-{self.max_dose_mg}mg>"

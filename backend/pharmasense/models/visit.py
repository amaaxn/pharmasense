import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    clinician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clinicians.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, server_default="in_progress")
    chief_complaint: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    drawing_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    extracted_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="visits")
    clinician: Mapped["Clinician"] = relationship("Clinician", back_populates="visits")
    prescriptions: Mapped[list["Prescription"]] = relationship("Prescription", back_populates="visit", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Visit {self.id} status={self.status}>"


from .patient import Patient  # noqa: E402
from .clinician import Clinician  # noqa: E402
from .prescription import Prescription  # noqa: E402

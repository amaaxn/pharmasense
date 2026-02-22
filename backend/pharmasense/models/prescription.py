import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Prescription(Base):
    __tablename__ = "prescriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visit_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("visits.id"), nullable=False)
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=False)
    clinician_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clinicians.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, server_default="recommended")
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    safety_summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    visit: Mapped["Visit"] = relationship("Visit", back_populates="prescriptions")
    patient: Mapped["Patient"] = relationship("Patient", back_populates="prescriptions")
    items: Mapped[list["PrescriptionItem"]] = relationship("PrescriptionItem", back_populates="prescription", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Prescription {self.id} status={self.status}>"


from .visit import Visit  # noqa: E402
from .patient import Patient  # noqa: E402
from .prescription_item import PrescriptionItem  # noqa: E402

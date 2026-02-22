import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    prescription_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("prescriptions.id"), nullable=False)
    drug_name: Mapped[str] = mapped_column(String(200), nullable=False)
    generic_name: Mapped[str] = mapped_column(String(200), nullable=False, server_default="")
    dosage: Mapped[str] = mapped_column(String(100), nullable=False)
    frequency: Mapped[str] = mapped_column(String(100), nullable=False)
    duration: Mapped[str] = mapped_column(String(100), nullable=False, server_default="")
    route: Mapped[str] = mapped_column(String(50), nullable=False, server_default="oral")
    tier: Mapped[int | None] = mapped_column(Integer, nullable=True)
    copay: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_covered: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    requires_prior_auth: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    safety_flags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    prescription: Mapped["Prescription"] = relationship("Prescription", back_populates="items")

    def __repr__(self) -> str:
        return f"<PrescriptionItem {self.drug_name} {self.dosage}>"


from .prescription import Prescription  # noqa: E402

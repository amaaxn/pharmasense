import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    allergies: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    current_medications: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    insurance_plan: Mapped[str] = mapped_column(String(200), nullable=False, server_default="")
    insurance_member_id: Mapped[str] = mapped_column(String(100), nullable=False, server_default="")
    medical_history: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    visits: Mapped[list["Visit"]] = relationship("Visit", back_populates="patient", lazy="selectin")
    prescriptions: Mapped[list["Prescription"]] = relationship("Prescription", back_populates="patient", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Patient {self.first_name} {self.last_name}>"


from .visit import Visit  # noqa: E402
from .prescription import Prescription  # noqa: E402

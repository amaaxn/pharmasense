import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class Clinician(Base):
    __tablename__ = "clinicians"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    npi_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    specialty: Mapped[str] = mapped_column(String(200), nullable=False, server_default="")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    visits: Mapped[list["Visit"]] = relationship("Visit", back_populates="clinician", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Clinician {self.first_name} {self.last_name} (NPI: {self.npi_number})>"


from .visit import Visit  # noqa: E402

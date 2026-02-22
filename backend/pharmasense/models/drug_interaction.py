import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class DrugInteraction(Base):
    __tablename__ = "drug_interactions"
    __table_args__ = (
        UniqueConstraint("drug_a", "drug_b", name="uq_drug_interaction_pair"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    drug_a: Mapped[str] = mapped_column(String(200), nullable=False)
    drug_b: Mapped[str] = mapped_column(String(200), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<DrugInteraction {self.drug_a} + {self.drug_b} ({self.severity})>"

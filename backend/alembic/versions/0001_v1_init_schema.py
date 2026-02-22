"""V1 init schema

Revision ID: 0001
Revises:
Create Date: 2026-02-21
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── patients ─────────────────────────────────────────────────────
    op.create_table(
        "patients",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), unique=True, nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("date_of_birth", sa.Date, nullable=False),
        sa.Column("allergies", JSONB, nullable=False, server_default="[]"),
        sa.Column("current_medications", JSONB, nullable=False, server_default="[]"),
        sa.Column("insurance_plan", sa.String(200), nullable=False, server_default=""),
        sa.Column("insurance_member_id", sa.String(100), nullable=False, server_default=""),
        sa.Column("medical_history", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── clinicians ───────────────────────────────────────────────────
    op.create_table(
        "clinicians",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), unique=True, nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("npi_number", sa.String(20), unique=True, nullable=False),
        sa.Column("specialty", sa.String(200), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── visits ───────────────────────────────────────────────────────
    op.create_table(
        "visits",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("patient_id", UUID(as_uuid=True), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("clinician_id", UUID(as_uuid=True), sa.ForeignKey("clinicians.id"), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="in_progress"),
        sa.Column("chief_complaint", sa.Text, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("drawing_data", JSONB, nullable=True),
        sa.Column("extracted_data", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_visits_patient_id", "visits", ["patient_id"])
    op.create_index("ix_visits_clinician_id", "visits", ["clinician_id"])

    # ── prescriptions ────────────────────────────────────────────────
    op.create_table(
        "prescriptions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("visit_id", UUID(as_uuid=True), sa.ForeignKey("visits.id"), nullable=False),
        sa.Column("patient_id", UUID(as_uuid=True), sa.ForeignKey("patients.id"), nullable=False),
        sa.Column("clinician_id", UUID(as_uuid=True), sa.ForeignKey("clinicians.id"), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="recommended"),
        sa.Column("rejection_reason", sa.Text, nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("safety_summary", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_prescriptions_visit_id", "prescriptions", ["visit_id"])
    op.create_index("ix_prescriptions_patient_id", "prescriptions", ["patient_id"])

    # ── prescription_items ───────────────────────────────────────────
    op.create_table(
        "prescription_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("prescription_id", UUID(as_uuid=True), sa.ForeignKey("prescriptions.id"), nullable=False),
        sa.Column("drug_name", sa.String(200), nullable=False),
        sa.Column("generic_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("dosage", sa.String(100), nullable=False),
        sa.Column("frequency", sa.String(100), nullable=False),
        sa.Column("duration", sa.String(100), nullable=False, server_default=""),
        sa.Column("route", sa.String(50), nullable=False, server_default="oral"),
        sa.Column("tier", sa.Integer, nullable=True),
        sa.Column("copay", sa.Numeric(10, 2), nullable=True),
        sa.Column("is_covered", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("requires_prior_auth", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("safety_flags", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_prescription_items_prescription_id", "prescription_items", ["prescription_id"])

    # ── formulary_entries ────────────────────────────────────────────
    op.create_table(
        "formulary_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("drug_name", sa.String(200), nullable=False, unique=True),
        sa.Column("generic_name", sa.String(200), nullable=False),
        sa.Column("tier", sa.Integer, nullable=False),
        sa.Column("copay_min", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("copay_max", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("requires_prior_auth", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_covered", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── drug_interactions ────────────────────────────────────────────
    op.create_table(
        "drug_interactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("drug_a", sa.String(200), nullable=False),
        sa.Column("drug_b", sa.String(200), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("drug_a", "drug_b", name="uq_drug_interaction_pair"),
    )

    # ── analytics_events ─────────────────────────────────────────────
    op.create_table(
        "analytics_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("event_data", JSONB, nullable=False, server_default="{}"),
        sa.Column("user_id", UUID(as_uuid=True), nullable=True),
        sa.Column("session_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_analytics_events_event_type", "analytics_events", ["event_type"])
    op.create_index("ix_analytics_events_created_at", "analytics_events", ["created_at"])


def downgrade() -> None:
    op.drop_table("analytics_events")
    op.drop_table("drug_interactions")
    op.drop_table("formulary_entries")
    op.drop_table("prescription_items")
    op.drop_table("prescriptions")
    op.drop_table("visits")
    op.drop_table("clinicians")
    op.drop_table("patients")

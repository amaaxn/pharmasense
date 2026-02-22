"""PDF generation for patient prescription summaries using ReportLab."""

from __future__ import annotations

import io
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pharmasense.schemas.gemini import PatientInstructionsOutput
    from pharmasense.schemas.receipt import PrescriptionReceipt

logger = logging.getLogger(__name__)


class PdfService:
    def generate(
        self,
        receipt: "PrescriptionReceipt",
        instructions: "PatientInstructionsOutput",
    ) -> bytes:
        try:
            return self._generate_with_reportlab(receipt, instructions)
        except ImportError:
            logger.warning("ReportLab not installed, generating plain-text PDF fallback")
            return self._generate_fallback(receipt, instructions)

    def _generate_with_reportlab(
        self,
        receipt: "PrescriptionReceipt",
        instructions: "PatientInstructionsOutput",
    ) -> bytes:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.75 * inch)
        styles = getSampleStyleSheet()
        elements: list = []

        title_style = ParagraphStyle(
            "Title2",
            parent=styles["Title"],
            fontSize=18,
            spaceAfter=12,
        )
        heading_style = ParagraphStyle(
            "Heading2Custom",
            parent=styles["Heading2"],
            fontSize=14,
            spaceAfter=6,
            spaceBefore=12,
        )
        body_style = styles["BodyText"]

        # Header
        elements.append(Paragraph("PharmaSense — Prescription Summary", title_style))
        elements.append(Spacer(1, 6))

        # Medication details
        if receipt.drugs:
            drug = receipt.drugs[0]
            elements.append(Paragraph("Medication", heading_style))
            elements.append(
                Paragraph(
                    f"<b>{drug.drug_name}</b> ({drug.generic_name})",
                    body_style,
                )
            )
            elements.append(
                Paragraph(
                    f"Dosage: {drug.dosage} | Frequency: {drug.frequency} | "
                    f"Duration: {drug.duration} | Route: {drug.route}",
                    body_style,
                )
            )

        # Coverage
        elements.append(Paragraph("Coverage", heading_style))
        elements.append(
            Paragraph(
                f"Plan: {receipt.coverage.plan_name} | "
                f"Member: {receipt.coverage.member_id} | "
                f"Total Copay: ${receipt.coverage.total_copay:.2f}",
                body_style,
            )
        )

        # Patient instructions
        elements.append(Paragraph("What This Medication Is For", heading_style))
        elements.append(Paragraph(instructions.purpose, body_style))

        elements.append(Paragraph("How to Take It", heading_style))
        elements.append(Paragraph(instructions.how_to_take, body_style))

        if instructions.what_to_avoid:
            elements.append(Paragraph("What to Avoid", heading_style))
            for item in instructions.what_to_avoid:
                elements.append(Paragraph(f"• {item}", body_style))

        # Side effects triage
        if instructions.side_effects or instructions.when_to_seek_help:
            elements.append(Paragraph("Side Effects", heading_style))
            table_data = [["Normal (usually harmless)", "Seek Help Immediately"]]
            max_rows = max(
                len(instructions.side_effects),
                len(instructions.when_to_seek_help),
            )
            for i in range(max_rows):
                left = instructions.side_effects[i] if i < len(instructions.side_effects) else ""
                right = (
                    instructions.when_to_seek_help[i]
                    if i < len(instructions.when_to_seek_help)
                    else ""
                )
                table_data.append([left, right])

            table = Table(table_data, colWidths=[3.5 * inch, 3.5 * inch])
            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (0, 0), colors.Color(0.85, 1, 0.85)),
                        ("BACKGROUND", (1, 0), (1, 0), colors.Color(1, 0.85, 0.85)),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 10),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ]
                )
            )
            elements.append(table)

        # Safety checks
        if receipt.safety and receipt.safety.checks:
            elements.append(Paragraph("Safety Checks", heading_style))
            for check in receipt.safety.checks:
                icon = "✓" if check.passed else "✕"
                elements.append(
                    Paragraph(f"{icon} {check.message}", body_style)
                )

        # Approver
        elements.append(Spacer(1, 12))
        elements.append(
            Paragraph(
                f"Approved by: {receipt.clinician_name} | Issued: {receipt.issued_at}",
                body_style,
            )
        )

        doc.build(elements)
        return buf.getvalue()

    def _generate_fallback(
        self,
        receipt: "PrescriptionReceipt",
        instructions: "PatientInstructionsOutput",
    ) -> bytes:
        lines = [
            "PharmaSense — Prescription Summary",
            "=" * 40,
            "",
        ]

        if receipt.drugs:
            drug = receipt.drugs[0]
            lines += [
                f"Medication: {drug.drug_name} ({drug.generic_name})",
                f"Dosage: {drug.dosage} | Frequency: {drug.frequency}",
                "",
            ]

        lines += [
            f"Purpose: {instructions.purpose}",
            f"How to Take: {instructions.how_to_take}",
            "",
        ]

        if instructions.what_to_avoid:
            lines.append("What to Avoid:")
            for item in instructions.what_to_avoid:
                lines.append(f"  - {item}")
            lines.append("")

        lines.append(f"Approved by: {receipt.clinician_name}")

        return "\n".join(lines).encode("utf-8")

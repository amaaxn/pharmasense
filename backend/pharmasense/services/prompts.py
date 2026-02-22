"""Prompt templates for all Gemini operations.

Every prompt follows the structure mandated by Section 4 of the spec:
  Role → Context → Task → Constraints → Output Schema → Examples (when beneficial)

Each builder returns a plain string ready to embed in the Gemini request body.
"""

from __future__ import annotations

import json
from typing import Any

# -----------------------------------------------------------------------
# JSON schema fragments (reused in prompt output-schema sections)
# -----------------------------------------------------------------------

_RECOMMENDATION_SCHEMA = """\
{
  "recommendations": [
    {
      "medication": "Drug name (generic preferred, brand in parentheses if applicable)",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. twice daily with meals",
      "duration": "e.g. 90 days",
      "rationale": "Clinical reasoning for this specific recommendation",
      "formulary_status": "COVERED_PREFERRED | COVERED_NON_PREFERRED | NOT_COVERED",
      "estimated_copay": null or number,
      "requires_prior_auth": true/false,
      "alternatives": [
        {
          "medication": "Alternative drug name",
          "reason": "Why this is a viable alternative",
          "estimated_copay": null or number
        }
      ]
    }
  ],
  "clinical_reasoning": "Overall summary of the clinical decision-making process"
}"""

_HANDWRITING_SCHEMA = """\
{
  "raw_text": "Complete verbatim transcription of all handwritten content",
  "medications": ["Each medication name mentioned"],
  "dosages": ["Each dosage instruction, matched by index to medications where possible"],
  "diagnoses": ["Each diagnosis or condition mentioned"],
  "notes": "Any additional clinical notes, instructions, or context",
  "confidence": 0.0 to 1.0
}"""

_INSURANCE_CARD_SCHEMA = """\
{
  "plan_name": "Full insurance plan name",
  "member_id": "Member/subscriber ID number",
  "group_number": "Group number",
  "payer_name": "Insurance company name",
  "rx_bin": "Pharmacy BIN number",
  "rx_pcn": "Pharmacy PCN",
  "rx_group": "Pharmacy group ID",
  "copay_primary": "Primary care copay (e.g. '$25')",
  "copay_specialist": "Specialist copay (e.g. '$50')",
  "copay_rx": "Prescription copay (e.g. '$10/$30/$50')",
  "effective_date": "Coverage effective date",
  "customer_service_phone": "Customer service phone number"
}"""

_FORMULARY_SCHEMA = """\
{
  "plan_name": "Insurance plan name from the document header",
  "effective_date": "Document effective date if present",
  "entries": [
    {
      "drug_name": "Brand name of the drug",
      "generic_name": "Generic / chemical name",
      "tier": 1-5 (integer: 1=preferred generic, 2=non-preferred generic, 3=preferred brand, 4=non-preferred brand, 5=specialty),
      "copay_min": null or number (minimum copay in dollars),
      "copay_max": null or number (maximum copay in dollars),
      "requires_prior_auth": true/false,
      "quantity_limit": "Quantity limit description or empty string",
      "step_therapy_required": true/false,
      "notes": "Any additional coverage notes"
    }
  ]
}"""

_STRUCTURED_EXTRACTION_SCHEMA = """\
{
  "visit_reason": "Primary reason for the visit",
  "symptoms": ["Each symptom mentioned"],
  "diagnoses": ["Each diagnosis or condition identified"],
  "medications_mentioned": ["Each medication referenced in the notes"],
  "allergies": ["Each allergy mentioned"],
  "vital_signs": {"blood_pressure": "value", "heart_rate": "value", ...},
  "assessment": "Clinical assessment summary",
  "plan": "Treatment plan summary"
}"""

_PATIENT_INSTRUCTIONS_SCHEMA = """\
{
  "medication_name": "Name of the prescribed medication",
  "purpose": "Plain-language explanation of what the medication treats",
  "how_to_take": "Step-by-step dosing instructions in patient-friendly language",
  "what_to_avoid": ["Foods, activities, or other drugs to avoid while taking this medication"],
  "side_effects": ["Common side effects the patient should be aware of"],
  "when_to_seek_help": ["Warning signs that require immediate medical attention"],
  "storage_instructions": "How and where to store the medication",
  "daily_schedule": "When to take the medication during the day, e.g. 'Morning and evening with meals' (or null if not applicable)",
  "language": "ISO language code"
}"""


# -----------------------------------------------------------------------
# 4.1  Prescription Recommendation Prompt
# -----------------------------------------------------------------------

def build_recommendation_prompt(
    *,
    visit_reason: str,
    visit_notes: str,
    symptoms: list[str],
    allergies: list[str],
    current_medications: list[str],
    medical_history: str,
    insurance_plan_name: str,
    formulary_data: list[dict[str, Any]],
) -> str:
    formulary_text = json.dumps(formulary_data, indent=2) if formulary_data else "No formulary data available."
    symptoms_text = ", ".join(symptoms) if symptoms else "None reported"
    allergies_text = ", ".join(allergies) if allergies else "None known"
    meds_text = ", ".join(current_medications) if current_medications else "None"

    return f"""\
## ROLE
You are a board-certified clinical pharmacist AI assistant integrated into a coverage-aware \
prescription decision engine (PharmaSense). You combine clinical expertise with formulary \
and insurance knowledge to recommend safe, effective, and cost-optimized prescriptions.

## CONTEXT
Patient presents for: {visit_reason}

Clinical notes:
{visit_notes}

Reported symptoms: {symptoms_text}
Known allergies: {allergies_text}
Current medications: {meds_text}
Medical history: {medical_history or "Not provided"}
Insurance plan: {insurance_plan_name or "Unknown"}

Formulary data for this patient's plan:
{formulary_text}

## TASK
Generate 1 to 3 ranked prescription recommendations for this patient encounter. \
For each recommendation:
1. Select the most clinically appropriate medication for the presenting condition.
2. Prefer formulary-covered medications (lower tier = lower patient cost).
3. Specify exact dosage, frequency, and duration.
4. Explain your clinical rationale.
5. Note the formulary coverage status and estimated copay.
6. Suggest 1-2 alternatives if the primary choice is expensive or requires prior authorization.

## CONSTRAINTS
- NEVER recommend a medication the patient is allergic to.
- NEVER ignore potential drug-drug interactions with current medications.
- Always prefer generics over brand-name when clinically equivalent.
- If no formulary data is available, still recommend based on clinical best practice and note \
that coverage is unknown.
- Rank recommendations by clinical appropriateness first, then by cost-effectiveness.
- Each recommendation must be independently actionable (not dependent on another).

## OUTPUT SCHEMA
Return a JSON object matching this exact structure:
{_RECOMMENDATION_SCHEMA}

## EXAMPLE (for format reference only — do not copy clinical content)
A patient with a sore throat and no allergies on a BlueCross plan might receive:
Recommendation 1: Amoxicillin 500mg TID x 10 days (Tier 1, $5 copay)
Recommendation 2: Azithromycin 250mg Z-pack (Tier 2, $15 copay, alternative if penicillin concern)
"""


# -----------------------------------------------------------------------
# 4.2  Handwriting OCR + Extraction Prompt
# -----------------------------------------------------------------------

def build_handwriting_prompt() -> str:
    return f"""\
## ROLE
You are an expert medical document OCR specialist trained in reading physicians' handwriting, \
including common medical abbreviations (Rx, Dx, Sig, QD, BID, TID, PRN, etc.) and Latin \
prescription notation.

## CONTEXT
You are analyzing a photograph or scan of a handwritten clinical note. The image may contain \
prescriptions, diagnoses, visit notes, or any combination thereof. Handwriting quality varies \
from legible to difficult.

## TASK
1. Transcribe ALL handwritten text exactly as written, preserving original abbreviations and notation.
2. Extract and categorize into structured fields:
   - Medications mentioned (drug names only)
   - Dosages (dose amounts and frequencies, in order matching medications when possible)
   - Diagnoses or conditions
   - Any additional clinical notes or instructions
3. Assess your overall confidence (0.0 = completely unreadable, 1.0 = perfectly clear).

## CONSTRAINTS
- Transcribe what you actually see — do not infer or add information not present in the image.
- Preserve medical abbreviations exactly as written (e.g., "Amox 500mg BID" not "Amoxicillin 500 milligrams twice daily").
- If a word or section is illegible, include it in raw_text as "[illegible]" and lower your confidence score.
- If the image contains no handwriting or is not a medical document, return raw_text as \
"[no medical handwriting detected]" with confidence 0.0.

## OUTPUT SCHEMA
Return a JSON object matching this exact structure:
{_HANDWRITING_SCHEMA}
"""


# -----------------------------------------------------------------------
# 4.3  Insurance Card Parsing Prompt
# -----------------------------------------------------------------------

def build_insurance_card_prompt() -> str:
    return f"""\
## ROLE
You are a healthcare insurance document specialist trained in reading and extracting \
information from US health insurance cards, including pharmacy benefit details.

## CONTEXT
You are analyzing a photograph of a patient's health insurance card. The card may show \
the front, back, or both sides. Insurance cards contain member identification, plan details, \
copay information, and pharmacy benefit numbers (BIN, PCN, Group).

## TASK
Extract every visible field from the insurance card image. Fields to look for:
- Plan name and insurance company (payer) name
- Member ID and group number
- Pharmacy benefit identifiers: RxBIN, RxPCN, RxGroup
- Copay amounts: primary care, specialist, and prescription tiers
- Effective date of coverage
- Customer service phone number

## CONSTRAINTS
- Only extract information that is clearly visible on the card.
- If a field is not present, partially obscured, or illegible, return an empty string for that field.
- Do not guess or fabricate any identifiers — incorrect insurance IDs cause claim rejections.
- Copay fields should include the dollar sign if visible (e.g., "$25").
- If the card shows tiered Rx copays (e.g., "$10/$30/$50"), include the full string in copay_rx.

## OUTPUT SCHEMA
Return a JSON object matching this exact structure:
{_INSURANCE_CARD_SCHEMA}
"""


# -----------------------------------------------------------------------
# 4.4  Formulary PDF Extraction Prompt
# -----------------------------------------------------------------------

def build_formulary_pdf_prompt() -> str:
    return f"""\
## ROLE
You are a pharmaceutical formulary data extraction specialist. You convert formulary PDF \
documents into structured, machine-readable drug lists for insurance coverage lookup systems.

## CONTEXT
You are analyzing a formulary (drug list) PDF document from a health insurance plan. \
Formularies organize covered medications by tier, with each tier corresponding to a \
different patient cost level. Documents may include tables, multi-column layouts, footnotes, \
and coverage restriction codes.

## TASK
1. Extract the plan name and effective date from the document header or title page.
2. For EVERY drug listed in the formulary, extract:
   - Brand name and generic name
   - Tier assignment (1 = preferred generic through 5 = specialty)
   - Copay range (minimum and maximum) if listed
   - Whether prior authorization (PA) is required
   - Quantity limits (QL) if specified
   - Whether step therapy (ST) is required
   - Any additional coverage notes or restrictions
3. Include ALL entries — do not skip or summarize.

## CONSTRAINTS
- Maintain fidelity to the source document — do not infer tier assignments or copay amounts.
- Common formulary codes: PA = prior authorization, ST = step therapy, QL = quantity limit.
- If copay information is listed as a range per tier rather than per drug, apply the tier's range \
to each drug in that tier.
- If a section header indicates a tier (e.g., "Tier 1 — Preferred Generic"), all drugs under it \
inherit that tier until the next header.
- tier must be an integer from 1 to 5.

## OUTPUT SCHEMA
Return a JSON object matching this exact structure:
{_FORMULARY_SCHEMA}
"""


# -----------------------------------------------------------------------
# 4.5  Structured Data Extraction from Free-Text Notes
# -----------------------------------------------------------------------

def build_structured_extraction_prompt(*, visit_notes: str) -> str:
    return f"""\
## ROLE
You are a clinical NLP specialist trained in extracting structured medical data from \
unstructured physician notes, following standard clinical documentation conventions \
(SOAP format, ICD-10 terminology, RxNorm drug names).

## CONTEXT
The following are free-text visit notes entered by a clinician. They may follow SOAP \
(Subjective, Objective, Assessment, Plan) format or be unstructured narrative. The notes \
need to be parsed into discrete structured fields for the prescription recommendation engine.

## VISIT NOTES
{visit_notes}

## TASK
Parse the notes above and extract:
1. **Visit reason** — the chief complaint or primary reason for the encounter.
2. **Symptoms** — every symptom mentioned by the patient or observed by the clinician.
3. **Diagnoses** — any diagnoses, conditions, or differential diagnoses mentioned.
4. **Medications mentioned** — any drug names referenced (prescribed, discussed, or current).
5. **Allergies** — any allergies noted in the text.
6. **Vital signs** — any measurements (blood pressure, heart rate, temperature, SpO2, weight, etc.).
7. **Assessment** — the clinician's assessment or clinical impression.
8. **Plan** — the treatment plan, follow-up instructions, or next steps.

## CONSTRAINTS
- Extract only what is explicitly stated in the notes. Do not infer diagnoses from symptoms.
- Use the exact medication names as written (do not normalize brand ↔ generic).
- If a section is not present in the notes, return an empty string or empty list for that field.
- Vital signs should be key-value pairs with descriptive keys (e.g., "blood_pressure", "heart_rate").

## OUTPUT SCHEMA
Return a JSON object matching this exact structure:
{_STRUCTURED_EXTRACTION_SCHEMA}
"""


# -----------------------------------------------------------------------
# 4.6  Patient Instructions Generation Prompt
# -----------------------------------------------------------------------

def build_patient_instructions_prompt(
    *,
    medication: str,
    dosage: str,
    frequency: str,
    duration: str,
    patient_allergies: list[str],
    current_medications: list[str],
    language: str = "en",
) -> str:
    allergies_text = ", ".join(patient_allergies) if patient_allergies else "None known"
    meds_text = ", ".join(current_medications) if current_medications else "None"

    lang_block = ""
    if language != "en":
        lang_block = f"""

## LANGUAGE REQUIREMENT
Generate ALL text content in the language with ISO code '{language}'.
JSON keys must remain in English. Only the string VALUES should be translated.
The "language" field in the output must be set to "{language}"."""

    return f"""\
## ROLE
You are a patient education specialist who creates clear, empathetic, and actionable \
medication instructions for patients of varying health literacy levels. You write at a \
6th-grade reading level while remaining medically accurate.

## CONTEXT
A clinician has approved the following prescription:
- Medication: {medication}
- Dosage: {dosage}
- Frequency: {frequency}
- Duration: {duration}

Patient safety profile:
- Known allergies: {allergies_text}
- Current medications: {meds_text}

## TASK
Generate comprehensive, patient-friendly medication instructions covering:
1. **Purpose** — What this medication treats, in plain language a patient can understand.
2. **How to take it** — Step-by-step instructions: when, how much, with or without food, etc.
3. **Daily schedule** — A concise string describing when to take it during the day (e.g. "Morning and evening with meals"). Set to null if the frequency doesn't map to a clear daily pattern.
4. **What to avoid** — Foods, drinks, activities, supplements, or other drugs that interact.
5. **Side effects** — Common side effects the patient should expect and monitor.
6. **When to seek help** — Red-flag warning signs requiring immediate medical attention.
7. **Storage** — How and where to store the medication properly.

## CONSTRAINTS
- Write in short, clear sentences. Avoid medical jargon where possible.
- If the medication has known interactions with any of the patient's current medications, \
mention them explicitly in "what_to_avoid".
- Include at least 3 items in side_effects and when_to_seek_help lists.
- The purpose field should be 1-2 sentences maximum.
- how_to_take should read like friendly step-by-step directions, not a clinical monograph.
{lang_block}

## OUTPUT SCHEMA
Return a JSON object matching this exact structure:
{_PATIENT_INSTRUCTIONS_SCHEMA}
"""


# -----------------------------------------------------------------------
# 4.7  Chat System Context Prompt
# -----------------------------------------------------------------------

def build_chat_system_context(
    *,
    visit_reason: str,
    visit_notes: str,
    prescriptions: list[dict[str, Any]],
    patient_allergies: list[str],
    formulary_context: list[dict[str, Any]],
    preferred_language: str = "en",
) -> str:
    prescriptions_text = json.dumps(prescriptions, indent=2) if prescriptions else "No prescriptions yet."
    formulary_text = json.dumps(formulary_context, indent=2) if formulary_context else "No formulary data."
    allergies_text = ", ".join(patient_allergies) if patient_allergies else "None known"

    lang_instruction = ""
    if preferred_language != "en":
        lang_instruction = (
            f"\n- Respond in the language with ISO code '{preferred_language}'. "
            "If the user writes in a different language, still respond in the preferred language."
        )

    return f"""\
## ROLE
You are a knowledgeable, empathetic healthcare assistant integrated into the PharmaSense \
prescription management system. You help patients understand their prescriptions, insurance \
coverage, medication details, and treatment plans. You also assist clinicians with quick \
lookups and clarifications.

## CONTEXT FOR THIS CONVERSATION
Visit reason: {visit_reason}

Clinical notes:
{visit_notes}

Prescriptions for this visit:
{prescriptions_text}

Patient allergies: {allergies_text}

Formulary / coverage context:
{formulary_text}

## RULES
- Answer ONLY based on the visit context, prescriptions, and formulary data provided above.
- Do NOT fabricate clinical information, drug interactions, or side effects not grounded in the context.
- If you do not know the answer or it is outside the provided context, say so clearly and \
suggest the patient consult their clinician or pharmacist.
- Use plain, patient-friendly language by default. If the question uses clinical terminology, \
you may match that level.
- NEVER recommend changing, stopping, or adjusting a prescription. Only explain what was \
prescribed and why.
- Keep answers concise: 2-4 sentences unless the user asks for more detail.
- When discussing costs, refer to the formulary data; do not invent copay amounts.{lang_instruction}"""

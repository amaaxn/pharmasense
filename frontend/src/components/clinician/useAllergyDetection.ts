import { useEffect, useRef, useState } from "react";

const COMMON_ALLERGIES = [
  "penicillin",
  "amoxicillin",
  "ampicillin",
  "sulfa",
  "sulfamethoxazole",
  "aspirin",
  "ibuprofen",
  "naproxen",
  "codeine",
  "morphine",
  "cephalosporin",
  "erythromycin",
  "azithromycin",
  "tetracycline",
  "ciprofloxacin",
  "metformin",
  "insulin",
  "latex",
  "contrast dye",
  "acetaminophen",
  "nsaid",
  "ace inhibitor",
  "statin",
  "benzodiazepine",
  "opioid",
];

const ALLERGY_PATTERNS = [
  /allerg(?:y|ic|ies)\s+(?:to\s+)?(\w+)/gi,
  /(\w+)\s+allerg/gi,
  /sensitive\s+to\s+(\w+)/gi,
  /cannot\s+(?:take|tolerate)\s+(\w+)/gi,
  /adverse\s+reaction\s+to\s+(\w+)/gi,
];

export function useAllergyDetection(notes: string): string[] {
  const [detected, setDetected] = useState<string[]>([]);
  const prevRef = useRef<string[]>([]);

  useEffect(() => {
    const found = new Set<string>();

    const lower = notes.toLowerCase();
    for (const drug of COMMON_ALLERGIES) {
      for (const pattern of ALLERGY_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(lower)) !== null) {
          const captured = match[1]?.toLowerCase();
          if (captured && COMMON_ALLERGIES.includes(captured)) {
            found.add(captured);
          }
        }
      }
      if (lower.includes(`${drug} allergy`) || lower.includes(`allergic to ${drug}`)) {
        found.add(drug);
      }
    }

    const arr = Array.from(found);
    const prev = prevRef.current;
    const changed =
      arr.length !== prev.length || arr.some((a) => !prev.includes(a));

    if (changed) {
      prevRef.current = arr;
      setDetected(arr);
    }
  }, [notes]);

  return detected;
}

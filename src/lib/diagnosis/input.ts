import type { DiagnosisInput } from "./types";

export const DTC_PATTERN = /^[PBCU][0-3][0-9A-F]{3}$/;
export const MAX_DTC_CODES = 5;
export const MAX_SYMPTOMS_LENGTH = 1000;
export const MIN_SYMPTOMS_LENGTH = 3;

export function parseDtcCodes(raw: string): { codes: string[] } | { error: string } {
  const tokens = raw
    .toUpperCase()
    .replace(/\b([PBCU])[\s-]+(?=[0-3])/g, "$1")
    .split(/[\s,;]+/)
    .filter(Boolean);
  const codes = [...new Set(tokens)];

  for (const token of codes) {
    if (!DTC_PATTERN.test(token)) {
      return { error: `"${token}" doesn't look like a trouble code. Codes look like P0420.` };
    }
  }

  if (codes.length > MAX_DTC_CODES) {
    return { error: "Enter up to 5 codes at a time." };
  }

  return { codes };
}

export function normalizeSymptoms(
  raw: string,
): { symptoms: string | null } | { error: string } {
  const symptoms = raw
    .trim()
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n");

  if (!symptoms) return { symptoms: null };
  if (symptoms.length < MIN_SYMPTOMS_LENGTH) {
    return { error: "Describe the symptom in a few more words." };
  }
  if (symptoms.length > MAX_SYMPTOMS_LENGTH) {
    return { error: "Keep the description under 1,000 characters." };
  }
  return { symptoms };
}

export function buildDiagnosisInput(
  rawCodes: string,
  rawSymptoms: string,
): { input: DiagnosisInput } | { error: string } {
  const parsedCodes = parseDtcCodes(rawCodes);
  if ("error" in parsedCodes) return parsedCodes;

  const parsedSymptoms = normalizeSymptoms(rawSymptoms);
  if ("error" in parsedSymptoms) return parsedSymptoms;

  if (parsedCodes.codes.length === 0 && parsedSymptoms.symptoms === null) {
    return { error: "Enter at least one trouble code or describe the symptom." };
  }

  return {
    input: { dtcCodes: parsedCodes.codes, symptoms: parsedSymptoms.symptoms },
  };
}

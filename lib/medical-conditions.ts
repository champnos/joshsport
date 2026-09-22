export const MEDICAL_CONDITIONS_FALLBACK = [
  "Heart conditions",
  "High or low blood pressure",
  "Diabetes",
  "Epilepsy",
  "Asthma",
  "Cancer (current or past)",
  "Blood disorders",
  "Skin conditions",
  "Varicose veins",
  "Pregnancy or postnatal",
  "Neurological conditions",
  "Other",
  "None of the above",
] as const;

export const NO_MEDICAL_CONDITIONS_VALUE = "None of the above";

export function toggleMedicalCondition(selectedConditions: string[], condition: string) {
  if (condition === NO_MEDICAL_CONDITIONS_VALUE) {
    return selectedConditions.includes(condition) ? [] : [NO_MEDICAL_CONDITIONS_VALUE];
  }

  const filteredConditions = selectedConditions.filter((entry) => entry !== NO_MEDICAL_CONDITIONS_VALUE);
  return filteredConditions.includes(condition)
    ? filteredConditions.filter((entry) => entry !== condition)
    : [...filteredConditions, condition];
}

export function hasNonNoneMedicalConditions(selectedConditions: string[]) {
  return selectedConditions.some((condition) => condition !== NO_MEDICAL_CONDITIONS_VALUE);
}

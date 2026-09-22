"use client";

import {
  hasNonNoneMedicalConditions,
  MEDICAL_CONDITIONS_FALLBACK,
} from "@/lib/medical-conditions";

interface MedicalConditionsChecklistProps {
  medicalConditions: string[];
  medicalNotes: string;
  onToggleCondition: (condition: string) => void;
  onMedicalNotesChange: (value: string) => void;
}

export function MedicalConditionsChecklist({
  medicalConditions,
  medicalNotes,
  onToggleCondition,
  onMedicalNotesChange,
}: MedicalConditionsChecklistProps) {
  const showMedicalNotes = hasNonNoneMedicalConditions(medicalConditions);

  return (
    <>
      <p className="text-sm text-gray-600 mb-6">Please tick if you have any of the following:</p>
      <div className="space-y-3">
        {MEDICAL_CONDITIONS_FALLBACK.map((condition) => (
          <label key={condition} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={medicalConditions.includes(condition)}
              onChange={() => onToggleCondition(condition)}
              className="h-4 w-4 rounded border-gray-300 text-brand-gold accent-brand-gold"
            />
            <span className="text-sm text-gray-700">{condition}</span>
          </label>
        ))}
      </div>
      {showMedicalNotes && (
        <div className="mt-6">
          <label className="block text-sm font-semibold text-brand-blue mb-2">Please provide details of your condition(s)</label>
          <textarea
            value={medicalNotes}
            onChange={(event) => onMedicalNotesChange(event.target.value)}
            rows={4}
            placeholder="Describe your conditions..."
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:border-brand-blue focus:outline-none placeholder-gray-500"
          />
        </div>
      )}
    </>
  );
}

// Which health-record tables staff can edit, and their editable fields.
// Server actions only accept these tables and fields (allow-list).

export type FieldDef = { name: string; label: string; required?: boolean; type?: "text" | "date" };

export const RECORD_TABLES = {
  medications: {
    tab: "Medications",
    fields: [
      { name: "name", label: "Medication", required: true },
      { name: "dose", label: "Dose" },
      { name: "schedule", label: "Schedule" },
    ],
  },
  allergies: {
    tab: "Allergies",
    fields: [
      { name: "allergen", label: "Allergen", required: true },
      { name: "reaction", label: "Reaction" },
      { name: "severity", label: "Severity" },
    ],
  },
  diagnoses: {
    tab: "Diagnoses",
    fields: [
      { name: "name", label: "Diagnosis", required: true },
      { name: "status", label: "Status" },
    ],
  },
  lab_values: {
    tab: "Lab values",
    fields: [
      { name: "test_name", label: "Test", required: true },
      { name: "value", label: "Value", required: true },
      { name: "unit", label: "Unit" },
    ],
  },
} as const satisfies Record<string, { tab: string; fields: readonly FieldDef[] }>;

export type RecordTable = keyof typeof RECORD_TABLES;
export const isRecordTable = (t: string): t is RecordTable => t in RECORD_TABLES;

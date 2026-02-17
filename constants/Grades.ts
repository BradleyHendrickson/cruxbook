// V-scale bouldering grades: VB through V18
// Stored as numeric value 0-19 for database
export const GRADES = [
  { label: 'VB', value: 0 },
  { label: 'V0', value: 1 },
  { label: 'V1', value: 2 },
  { label: 'V2', value: 3 },
  { label: 'V3', value: 4 },
  { label: 'V4', value: 5 },
  { label: 'V5', value: 6 },
  { label: 'V6', value: 7 },
  { label: 'V7', value: 8 },
  { label: 'V8', value: 9 },
  { label: 'V9', value: 10 },
  { label: 'V10', value: 11 },
  { label: 'V11', value: 12 },
  { label: 'V12', value: 13 },
  { label: 'V13', value: 14 },
  { label: 'V14', value: 15 },
  { label: 'V15', value: 16 },
  { label: 'V16', value: 17 },
  { label: 'V17', value: 18 },
  { label: 'V18', value: 19 },
] as const;

export function gradeToLabel(value: number | null): string {
  if (value == null) return '—';
  const grade = GRADES.find((g) => g.value === value);
  if (grade) return grade.label;
  return value.toFixed(1);
}

export function labelToGrade(label: string): number | null {
  const grade = GRADES.find((g) => g.label === label);
  return grade?.value ?? null;
}

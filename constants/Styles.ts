// Boulder/route wall styles
export const STYLES = [
  { label: 'Slab', value: 'SLAB' },
  { label: 'Vert', value: 'VERT' },
  { label: 'Overhang', value: 'OVERHANG' },
  { label: 'Roof', value: 'ROOF' },
  { label: 'Traverse', value: 'TRAVERSE' },
  { label: 'Arete', value: 'ARETE' },
  { label: 'Dihedral', value: 'DIHEDRAL' },
] as const;

export type StyleValue = (typeof STYLES)[number]['value'];

export function styleToLabel(value: string | null): string {
  if (value == null) return '—';
  const style = STYLES.find((s) => s.value === value);
  return style?.label ?? value;
}

export function labelToStyle(label: string): string | null {
  const style = STYLES.find((s) => s.label === label);
  return style?.value ?? null;
}

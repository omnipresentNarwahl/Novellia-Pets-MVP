/** Trims the value, and turns empty into null, matching what the server stores. */
export function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

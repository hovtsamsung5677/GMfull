export function normalizePanelCode(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePanelName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function trimPanelString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

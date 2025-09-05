export function parseIdParam(value: unknown): number | null {
  const id = Number(value);
  return Number.isNaN(id) || id < 1 ? null : id;
}

export default parseIdParam;

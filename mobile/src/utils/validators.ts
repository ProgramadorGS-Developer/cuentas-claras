// Validaciones reutilizadas por formularios (CU-01 A2, CU-03 A2, etc.)
// Mismos límites que valida el servidor (server/src/utils/validation.ts): si cambian allá, cambiarlos acá.
export const MIN_NOMBRE_PERSONA = 2;
export const MAX_NOMBRE = 60;
export const MAX_ITEM = 80;

export function isNonEmptyName(value: string): boolean {
  return value.trim().length >= MIN_NOMBRE_PERSONA;
}

export function isValidPrice(value: string): boolean {
  const n = Number(value.replace(",", "."));
  return !Number.isNaN(n) && n > 0;
}

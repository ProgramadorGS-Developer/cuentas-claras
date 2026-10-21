// Validación de textos que llegan del cliente (nombres de sesión, de personas y de ítems).
// Regla compartida por crear sesión, editarla y unirse (tarjeta #66). Si el valor no es
// válido las funciones devuelven null y el controller responde 400.

export const MAX_NOMBRE = 60;
export const MAX_ITEM = 80;

// Nombre de persona (anfitrión o invitado): texto de 2 a 60 caracteres, sin espacios a los costados.
export function normalizarNombrePersona(value: unknown): string | null {
  return normalizarTexto(value, 2, MAX_NOMBRE);
}

// Nombre de la sesión: texto de 1 a 60 caracteres.
export function normalizarNombreSesion(value: unknown): string | null {
  return normalizarTexto(value, 1, MAX_NOMBRE);
}

// Lista de ítems: array de textos de hasta 80 caracteres. Los vacíos ("" o "   ") se descartan
// en vez de rechazar todo el pedido, porque la app puede mandar una fila que quedó sin completar.
// Un string suelto ("Carbón") no es una lista válida: antes se iteraba letra por letra.
export function normalizarItems(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const limpio = item.trim();
    if (limpio.length === 0) continue;
    if (limpio.length > MAX_ITEM) return null;
    items.push(limpio);
  }
  return items;
}

function normalizarTexto(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null;
  const limpio = value.trim();
  return limpio.length >= min && limpio.length <= max ? limpio : null;
}

// Validación de montos de dinero (precio pagado de un ítem, aporte de presupuesto).
// Regla de negocio compartida por 1.1.4.1 (precios) y 1.1.4.2 (aportes).

// true si `numero` tiene más de 2 decimales. La comparación es con tolerancia
// porque `19.99 * 100` da 1998.9999999999998 en punto flotante binario.
export function tieneMasDeDosDecimales(numero: number): boolean {
  return Math.abs(numero * 100 - Math.round(numero * 100)) > 1e-6;
}

const MAX_MONTO = 999999.99;

// Valida un monto: number finito, entre `min` y 999999.99, con hasta 2 decimales.
// `min` por defecto 0 (un ítem se puede donar con precio 0); para aportes usar min > 0.
export function esMontoValido(value: unknown, min = 0): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= MAX_MONTO &&
    !tieneMasDeDosDecimales(value)
  );
}

/**
 * Prueba de estrés de concurrencia (EDT 1.4.3.1 — la más crítica).
 * Ver docs/08-plan-de-pruebas.md §8.3 y docs/12-diseno-concurrencia-de-reserva.md.
 *
 * Levanta un escenario contra un backend YA CORRIENDO y dispara N solicitudes
 * `POST /items/:itemId/reserve` en paralelo sobre el mismo ítem. Espera:
 *   - exactamente una respuesta 200 (ganador)
 *   - el resto 409 con el mismo `reservedBy`
 *   - `items.reserved_by` final = el ganador
 * Además prueba la doble compra: una 200, la segunda 409.
 *
 * Uso:
 *   npm run dev            # en otra terminal
 *   npm run stress:reserve
 *   API_URL=http://localhost:3000 N=20 npm run stress:reserve
 */

const API_URL = process.env.API_URL ?? "http://localhost:3000";
const N = Number(process.env.N ?? 12);

async function post(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json as any };
}

async function get(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  return (await res.json()) as any;
}

async function main() {
  console.log(`→ backend: ${API_URL} · ${N} intentos simultáneos\n`);

  const session = await post("/sessions", { name: "Stress test", hostName: "Ana", items: ["Carbón"] });
  const sessionId = session.body.id as string;
  const items = await get(`/sessions/${sessionId}/items`);
  const itemId = items[0].id as string;

  const participants = await Promise.all(
    Array.from({ length: N }, (_, i) => post(`/sessions/${sessionId}/participants`, { name: `P${i + 1}` })),
  );
  const participantIds = participants.map((p) => p.body.id as string);

  // --- Carrera de reserva ---
  const results = await Promise.all(
    participantIds.map((participantId) => post(`/items/${itemId}/reserve`, { participantId })),
  );
  const ok = results.filter((r) => r.status === 200);
  const conflict = results.filter((r) => r.status === 409);
  const otros = results.filter((r) => r.status !== 200 && r.status !== 409);

  const finalItem = (await get(`/sessions/${sessionId}/items`))[0];
  const winnerId = ok[0]?.body.reservedBy;
  const conflictConsistente = conflict.every((r) => r.body.reservedBy === winnerId);

  console.log(`reserva  200: ${ok.length}  ·  409: ${conflict.length}  ·  otros: ${otros.length}`);
  console.log(`items.reserved_by final: ${finalItem.reservedBy}`);

  // --- Doble compra ---
  const buy1 = await post(`/items/${itemId}/purchase`, { participantId: winnerId, pricePaid: 100 });
  const buy2 = await post(`/items/${itemId}/purchase`, { participantId: winnerId, pricePaid: 999 });
  console.log(`compra   1ra: ${buy1.status}  ·  2da: ${buy2.status}`);

  const checks = [
    ["exactamente una reserva 200", ok.length === 1],
    [`las otras ${N - 1} son 409`, conflict.length === N - 1 && otros.length === 0],
    ["todas las 409 apuntan al mismo ganador", conflictConsistente],
    ["items.reserved_by final = ganador", finalItem.reservedBy === winnerId],
    ["primera compra 200", buy1.status === 200],
    ["segunda compra 409", buy2.status === 409],
  ] as const;

  console.log();
  let allOk = true;
  for (const [label, pass] of checks) {
    console.log(`${pass ? "✓" : "✗"} ${label}`);
    allOk &&= pass;
  }
  console.log();
  if (!allOk) {
    console.error("FALLÓ la prueba de concurrencia");
    process.exit(1);
  }
  console.log("OK — arbitraje determinista");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

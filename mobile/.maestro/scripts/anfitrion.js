// Simula, desde el flow, lo que haría el anfitrión "Ana" en su propio celular.
// Corre en la máquina de Maestro (no en el teléfono), así que localhost es el
// server local directamente, sin adb reverse.
// Cada runScript corre en un scope aislado (solo `output` persiste entre
// scripts), por eso los helpers viven acá y la acción se elige con ACCION.
var API = "http://localhost:3000";

function post(path, body) {
  var res = http.post(API + path, {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (res.status >= 300) throw new Error("POST " + path + " -> " + res.status + ": " + res.body);
  return json(res.body);
}

function get(path) {
  var res = http.get(API + path);
  if (res.status >= 300) throw new Error("GET " + path + " -> " + res.status + ": " + res.body);
  return json(res.body);
}

if (ACCION === "crear-sesion") {
  // Sesión con 3 ítems; deja en output el token del link y los ids para seguir actuando como Ana.
  var s = post("/sessions", { name: "Asado Maestro", hostName: "Ana", items: ["Carne", "Pan", "Hielo"] });
  output.shareToken = s.shareToken;
  output.sessionId = s.id;
  output.hostId = s.hostId;
} else if (ACCION === "comprar") {
  // Reserva ITEM y lo marca comprado a PRECIO.
  var item = get("/sessions/" + output.sessionId + "/items").filter(function (i) {
    return i.name === ITEM;
  })[0];
  post("/items/" + item.id + "/reserve", { participantId: output.hostId });
  post("/items/" + item.id + "/purchase", { participantId: output.hostId, pricePaid: Number(PRECIO) });
} else {
  throw new Error("ACCION desconocida: " + ACCION);
}

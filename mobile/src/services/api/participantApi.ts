import { httpClient } from "./httpClient";
import { Participant } from "@/domain/models";

// RF-02 / CU-01: registrar a quien se une por link como participante real de la sesión.
// Sin esto, el id de participante solo existe en el celular (nunca en el servidor), y
// cualquier acción sobre ítems (reservar/liberar/comprar) falla con 404 porque el backend
// no lo reconoce (ver docs/12-diseno-concurrencia-de-reserva.md).
export const participantApi = {
  // El servidor devuelve el objeto ya en camelCase (coincide 1:1 con el tipo Participant).
  register: (sessionId: string, name: string) =>
    httpClient.post<Participant>(`/sessions/${sessionId}/participants`, { name }),
};

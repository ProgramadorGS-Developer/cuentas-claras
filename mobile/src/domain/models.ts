// Modelos de dominio compartidos por toda la app (UI, store, DB local, API).
// Reflejan el diccionario de datos (ver docs/05-modelo-de-datos.md).

export type ItemStatus = "pendiente" | "comprado";

export interface Session {
  id: string;
  name: string;
  hostName: string;
  createdAt: string;
  closedAt: string | null;
  shareToken: string;
}

export interface Participant {
  id: string;
  sessionId: string;
  name: string;
  isHost: boolean;
  joinedAt: string;
}

export interface ShoppingItem {
  id: string;
  sessionId: string;
  name: string;
  status: ItemStatus;
  reservedBy: string | null; // participant id
  observation: string | null;
  pricePaid: number | null;
  ticketImageUri: string | null;
  updatedAt: string;
}

export interface ReservationAttempt {
  id: string;
  itemId: string;
  participantId: string;
  requestedAt: string;
  resolved: boolean;
}

export interface BudgetContribution {
  id: string;
  sessionId: string;
  participantId: string;
  amount: number;
  createdAt: string;
}

export interface BalanceEntry {
  participantId: string;
  participantName: string;
  contributed: number;
  spent: number;
  net: number; // positivo: debe recibir, negativo: debe pagar
}

export interface SettlementTransfer {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
}

// Payload de GET /sessions/:id/result y /sessions/shared/:shareToken/result — mismo shape
// que server/src/services/balance.service.ts (SessionResult), fuente de verdad del balance.
export interface SessionTotals {
  spent: number;
  contributed: number;
  noBudgetLoaded: boolean;
}

export interface SessionResult {
  sessionId: string;
  totals: SessionTotals;
  balances: BalanceEntry[];
  transfers: SettlementTransfer[];
}

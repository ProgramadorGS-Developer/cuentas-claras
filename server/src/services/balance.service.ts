import { db } from "../db/connection";

// Motor de cálculo de gastos y balances (RF-14, CU-04/CU-04a, EDT 1.1.4.2).
// El servidor es la fuente de verdad; el cliente aplica la misma fórmula de forma optimista
// en mobile/src/domain/balanceCalculator.ts. Fórmula: docs/05-modelo-de-datos.md §5.3.
//
//   aportado(P) = Σ budget_contributions.amount donde participant_id = P
//   gastado(P)  = Σ items.price_paid donde reserved_by = P y status = 'comprado'
//   sin presupuesto cargado (Σ aportes = 0): neto(P) = gastado(P) − total_gastado / N
//   con presupuesto:                          neto(P) = aportado(P) − gastado(P)
//   neto > 0 → debe recibir · neto < 0 → debe pagar

export interface BalanceEntry {
  participantId: string;
  participantName: string;
  contributed: number;
  spent: number;
  net: number;
}

export interface SettlementTransfer {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
}

export interface SessionResult {
  sessionId: string;
  totals: { spent: number; contributed: number; noBudgetLoaded: boolean };
  balances: BalanceEntry[];
  transfers: SettlementTransfer[];
}

interface ParticipantRow {
  id: string;
  name: string;
}
interface PurchasedItemRow {
  reserved_by: string | null;
  price_paid: number;
}
interface ContributionRow {
  participant_id: string;
  amount: number;
}

const round2 = (n: number) => Number(n.toFixed(2));

export function computeSessionResult(sessionId: string): SessionResult {
  const participants = db
    .prepare("SELECT id, name FROM participants WHERE session_id = ?")
    .all(sessionId) as unknown as ParticipantRow[];
  const items = db
    .prepare(
      "SELECT reserved_by, price_paid FROM items WHERE session_id = ? AND status = 'comprado' AND price_paid IS NOT NULL",
    )
    .all(sessionId) as unknown as PurchasedItemRow[];
  const contributions = db
    .prepare("SELECT participant_id, amount FROM budget_contributions WHERE session_id = ?")
    .all(sessionId) as unknown as ContributionRow[];

  const totalSpent = items.reduce((sum, i) => sum + i.price_paid, 0);
  const totalContributed = contributions.reduce((sum, c) => sum + c.amount, 0);
  const noBudgetLoaded = totalContributed === 0;

  const balances: BalanceEntry[] = participants.map((p) => {
    const contributed = contributions
      .filter((c) => c.participant_id === p.id)
      .reduce((sum, c) => sum + c.amount, 0);
    const spent = items.filter((i) => i.reserved_by === p.id).reduce((sum, i) => sum + i.price_paid, 0);

    const fairShare = noBudgetLoaded ? totalSpent / (participants.length || 1) : contributed;
    const net = noBudgetLoaded ? spent - fairShare : contributed - spent;

    return {
      participantId: p.id,
      participantName: p.name,
      contributed: round2(contributed),
      spent: round2(spent),
      net: round2(net),
    };
  });

  return {
    sessionId,
    totals: {
      spent: round2(totalSpent),
      contributed: round2(totalContributed),
      noBudgetLoaded,
    },
    balances,
    transfers: simplifySettlement(balances),
  };
}

// Simplificación de deudas (greedy): empareja el mayor deudor con el mayor acreedor
// hasta saldar todo con la menor cantidad posible de transferencias.
export function simplifySettlement(balances: BalanceEntry[]): SettlementTransfer[] {
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net - b.net);
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(-debtor.net, creditor.net);

    if (amount > 0.01) {
      transfers.push({
        fromParticipantId: debtor.participantId,
        toParticipantId: creditor.participantId,
        amount: round2(amount),
      });
    }

    debtor.net += amount;
    creditor.net -= amount;

    if (Math.abs(debtor.net) < 0.01) i++;
    if (Math.abs(creditor.net) < 0.01) j++;
  }

  return transfers;
}

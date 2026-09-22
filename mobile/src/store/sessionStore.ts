import { create } from "zustand";
import { BudgetContribution, ShoppingItem, Participant, Session } from "@/domain/models";

// Estado de la sesión de compra activa en memoria (se hidrata desde SQLite local al entrar,
// ver hooks/useShoppingList.ts, y se actualiza en tiempo real vía sockets).
interface SessionState {
  session: Session | null;
  participants: Participant[];
  items: ShoppingItem[];
  contributions: BudgetContribution[];
  setSession: (session: Session) => void;
  setParticipants: (participants: Participant[]) => void;
  setItems: (items: ShoppingItem[]) => void;
  upsertItem: (item: ShoppingItem) => void;
  setContributions: (contributions: BudgetContribution[]) => void;
  addContribution: (contribution: BudgetContribution) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  participants: [],
  items: [],
  contributions: [],
  setSession: (session) => set({ session }),
  setParticipants: (participants) => set({ participants }),
  setItems: (items) => set({ items }),
  upsertItem: (item) => {
    const items = get().items.filter((i) => i.id !== item.id);
    set({ items: [...items, item] });
  },
  setContributions: (contributions) => set({ contributions }),
  addContribution: (contribution) => set({ contributions: [...get().contributions, contribution] }),
}));

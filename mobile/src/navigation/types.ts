import { Session } from "@/domain/models";

// Tipado de rutas de navegación. Mantiene la app type-safe (buena práctica RN + TS).
export type RootStackParamList = {
  JoinSession: { sessionId?: string; token?: string } | undefined;
  EnterName: { sessionId: string; session?: Session };
  Tabs: undefined;
  ItemDetail: { itemId: string };
  NewSession: undefined;
  History: undefined;
  Settings: undefined;
};

export type TabsParamList = {
  Home: undefined;
  ShoppingList: undefined;
  Budget: undefined;
  Result: undefined;
  Meeting: undefined;
};

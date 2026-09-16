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
  // token: llega por el deep link de "Compartir resultado" (cuentasclaras://result?token=...,
  // EDT 1.1.4.3) para ver el balance sin tener una sesión propia en este dispositivo.
  Result: { token?: string } | undefined;
  Meeting: undefined;
};

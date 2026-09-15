import * as Linking from "expo-linking";
import { LinkingOptions } from "@react-navigation/native";
import { RootStackParamList } from "./types";

// CU-01 / RF-01: enrutamiento del link de invitación (cuentasclaras://join?token=...) hacia
// JoinSessionScreen, que lee route.params.token (ver services/whatsapp/shareLink.ts, donde se
// arma ese link, y screens/access/JoinSessionScreen.tsx, que lo consume).
// Sin este `linking`, React Navigation nunca traduce la URL entrante en parámetros de pantalla:
// el link se abre pero la app queda en la pantalla inicial sin token, como si nada hubiera pasado.
//
// Linking.createURL(...) resuelve al prefijo correcto en cada contexto: cuentasclaras:// en una
// build standalone, exp://<ip>:<puerto>/--/ en Expo Go durante desarrollo, y el propio origin
// (http://localhost:puerto/) en el preview web — así el mismo link funciona en los tres.
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL("/"), "cuentasclaras://"],
  config: {
    screens: {
      JoinSession: "join",
      EnterName: "enter-name/:sessionId",
      NewSession: "new-session",
      History: "history",
      Settings: "settings",
      ItemDetail: "item/:itemId",
      Tabs: {
        screens: {
          Home: "home",
          ShoppingList: "list",
          Budget: "budget",
          Result: "result",
          Meeting: "meeting",
        },
      },
    },
  },
};

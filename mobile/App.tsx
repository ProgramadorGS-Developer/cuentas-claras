import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { RootNavigator } from "@/navigation/RootNavigator";
import { linking } from "@/navigation/linking";
import { initDatabase } from "@/database";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";

// Punto de entrada de la app CuentasClaras.
// 1) Inicializa la base de datos local SQLite (cache offline-first, ver docs/05-modelo-de-datos.md)
// 2) Monta la navegación (ver docs/06-estructura-de-carpetas.md)
export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initDatabase().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

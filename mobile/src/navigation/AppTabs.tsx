import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { TabsParamList } from "./types";
import { HomeScreen } from "@/screens/home/HomeScreen";
import { ShoppingListScreen } from "@/screens/session/ShoppingListScreen";
import { BudgetScreen } from "@/screens/budget/BudgetScreen";
import { ResultScreen } from "@/screens/result/ResultScreen";
import { MeetingExpensesScreen } from "@/screens/meeting/MeetingExpensesScreen";
import { CartIcon, HomeIcon, SwapIcon, UsersIcon, WalletIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

// Navegación principal por pestañas, una vez el usuario está identificado en una sesión.
// Cubre RF-04 (home), RF-05..RF-12 (lista), RF-13 (presupuesto), RF-14/RF-16 (resultado), RF-15 (reunión).
const Tab = createBottomTabNavigator<TabsParamList>();

const TAB_ICONS = {
  Home: HomeIcon,
  ShoppingList: CartIcon,
  Budget: WalletIcon,
  Result: SwapIcon,
  Meeting: UsersIcon,
} as const;

export function AppTabs() {
  return (
    <Tab.Navigator
      // Fondo de todas las pestañas: el mismo gris verdoso de las pantallas con tarjetas, en vez
      // del gris por defecto de React Navigation (que hacía que Presupuesto/Resultado/Reunión
      // se vieran distintas al Inicio).
      sceneContainerStyle={{ backgroundColor: colors.screenBg }}
      screenOptions={({ route }) => {
        const Icon = TAB_ICONS[route.name];
        return {
          headerShown: true,
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerShadowVisible: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ focused, color, size }) => (
            // "Píldora" suave detrás del ícono activo (estilo Material 3): marca dónde estás
            // sin depender solo del color, que es lo que pedía RNF-04 (alto contraste).
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              <Icon size={size - 3} color={color} />
            </View>
          ),
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "Inicio" }} />
      <Tab.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: "Lista" }} />
      <Tab.Screen name="Budget" component={BudgetScreen} options={{ title: "Presupuesto" }} />
      <Tab.Screen name="Result" component={ResultScreen} options={{ title: "Resultado" }} />
      <Tab.Screen
        name="Meeting"
        component={MeetingExpensesScreen}
        options={{ title: "En la reunión" }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  tabBar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  // 11px: "En la reunión" es el label más largo y con 5 tabs en 360-390px de ancho no entra más grande.
  tabLabel: { fontSize: 11, fontWeight: "600" },
  iconPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: 14,
    backgroundColor: "transparent",
  },
  iconPillActive: { backgroundColor: colors.tintGreen },
});

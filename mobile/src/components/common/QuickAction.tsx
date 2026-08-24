import { Platform, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { ReactNode } from "react";

const bubbleShadow = Platform.select({
  web: { boxShadow: "0 4px 10px rgba(0,0,0,0.05)" },
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
});

interface Props {
  label: string;
  tint: string;
  icon: ReactNode;
  onPress: () => void;
}

// Botón "burbuja" pastel con label debajo, siempre con onPress real:
// evita el look de "clickeable pero sin acción" (feedback de diseño previo).
export function QuickAction({ label, tint, icon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.bubble, { backgroundColor: tint }, bubbleShadow]}>{icon}</View>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center" },
  bubble: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  label: { color: colors.text, fontWeight: "600" },
});

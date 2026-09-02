import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { ReactNode } from "react";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "info";
  disabled?: boolean;
  icon?: ReactNode;
}

const VARIANT_COLORS = {
  primary: colors.primary,
  secondary: colors.secondary,
  danger: colors.danger,
  info: colors.info,
};

// Botón único reutilizado en toda la app: mantiene consistencia visual (buena práctica de UI kit propio).
export function AppButton({ label, onPress, variant = "primary", disabled, icon }: Props) {
  const bg = VARIANT_COLORS[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <AppText variant="button" style={{ color: "#fff" }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52, // touch target grande, apto para uso "en movimiento" (RNF-04)
  },
  icon: { marginRight: spacing.sm },
});

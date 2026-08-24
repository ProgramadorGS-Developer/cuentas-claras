import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors } from "@/theme/colors";

export type StatusPillVariant = "active" | "pending" | "closed";

const VARIANTS: Record<StatusPillVariant, { bg: string; fg: string }> = {
  active: { bg: colors.tintGreen, fg: colors.primaryDark },
  pending: { bg: colors.tintOrange, fg: "#B45F06" },
  closed: { bg: colors.surface, fg: colors.textMuted },
};

// Pill de estado reutilizado en tarjetas de sesión (activa / pendiente de cierre / cerrada).
export function StatusPill({ label, variant }: { label: string; variant: StatusPillVariant }) {
  const { bg, fg } = VARIANTS[variant];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <AppText variant="caption" style={{ color: fg, fontWeight: "700" }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
});

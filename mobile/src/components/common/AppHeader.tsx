import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { ArrowLeftIcon, BellIcon, UsersIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

interface Props {
  onBack?: () => void;
}

// Header propio (reemplaza el nativo de react-navigation) para mantener la marca
// visible en toda la app: flecha atrás opcional a la izquierda, logo centrado,
// campana de notificaciones a la derecha (decorativa por ahora, no hay pantalla destino).
export function AppHeader({ onBack }: Props) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
            <ArrowLeftIcon size={22} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.brand}>
        <View style={styles.brandBadge}>
          <UsersIcon size={16} color={colors.primaryDark} />
        </View>
        <AppText variant="bodyBold">
          Cuentas
          <AppText variant="bodyBold" style={{ color: colors.primaryDark }}>
            Claras
          </AppText>
        </AppText>
      </View>

      <View style={[styles.side, styles.sideRight]}>
        <View style={styles.bellBadge}>
          <BellIcon size={18} color={colors.text} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  side: { width: 36, alignItems: "flex-start" },
  sideRight: { alignItems: "flex-end" },
  backButton: { padding: 4 },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.tintGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
});

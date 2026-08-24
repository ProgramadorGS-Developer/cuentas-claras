import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { SettingsIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

// Placeholder honesto: todavía no hay preferencias configurables (no hay pantalla previa
// que las use), pero el acceso desde el Home ya queda armado para cuando se agreguen.
export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconRing}>
        <SettingsIcon size={26} color={colors.primaryDark} />
      </View>
      <AppText variant="h2" style={styles.title}>
        Configuración
      </AppText>
      <AppText variant="body" style={styles.body}>
        Todavía no hay preferencias para ajustar acá. Cuando sumemos
        notificaciones y datos de la cuenta, van a aparecer en esta pantalla.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  iconRing: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.tintGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { marginBottom: spacing.sm },
  body: { textAlign: "center", color: colors.textMuted, maxWidth: 280 },
});

import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { AppButton } from "@/components/common/AppButton";
import { SettingsIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { useUserStore } from "@/store/userStore";
import { sessionApi } from "@/services/api/sessionApi";
import { sessionRepository } from "@/database/repositories/sessionRepository";

// RF-04 (EDT 1.1.2.1): cerrar la sesión activa. Solo el anfitrión la ve, y solo mientras
// haya una sesión activa sin cerrar (ver useHomeDashboard, que ya distingue ese estado).
export function SettingsScreen() {
  const { active, refresh } = useHomeDashboard();
  const { isHost, participantId } = useUserStore();
  const [closing, setClosing] = useState(false);

  const canClose = !!active && !active.session.closedAt && isHost && !!participantId;

  function confirmClose() {
    if (!active || !participantId) return;
    Alert.alert(
      "Cerrar sesión",
      "Los participantes ya no van a poder reservar ni marcar ítems como comprados. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Cerrar sesión", style: "destructive", onPress: handleClose },
      ],
    );
  }

  async function handleClose() {
    if (!active || !participantId) return;
    setClosing(true);
    try {
      const { data } = await sessionApi.close(active.session.id, participantId);
      await sessionRepository.upsert(data);
      await refresh();
    } catch {
      Alert.alert("No se pudo cerrar la sesión", "Probá de nuevo en un momento.");
    } finally {
      setClosing(false);
    }
  }

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

      {canClose && (
        <View style={styles.closeSection}>
          <AppButton
            label={closing ? "Cerrando..." : "Cerrar sesión"}
            variant="danger"
            onPress={confirmClose}
            disabled={closing}
          />
        </View>
      )}
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
  closeSection: { marginTop: spacing.xl, width: "100%", maxWidth: 320 },
});

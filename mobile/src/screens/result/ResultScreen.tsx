import { useState } from "react";
import { Alert, FlatList, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { AppButton } from "@/components/common/AppButton";
import { BalanceCard } from "@/components/result/BalanceCard";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useSessionStore } from "@/store/sessionStore";
import { useSessionResult } from "@/hooks/useSessionResult";
import { sessionApi } from "@/services/api/sessionApi";
import { shareResultSummary } from "@/services/whatsapp/shareLink";

// CU-04/CU-04a + RF-14/RF-16: balance final y opción de compartirlo.
export function ResultScreen() {
  const session = useSessionStore((s) => s.session);
  const { balances, noBudgetLoaded } = useSessionResult(session?.id ?? "");
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    if (!session) return;
    setSharing(true);
    try {
      // El texto (con nombres, no IDs) y el deep link los arma el servidor — ver
      // server/src/services/balance.service.ts -> buildResultShareText (EDT 1.1.4.3).
      const { data } = await sessionApi.getSharedResult(session.shareToken);
      await shareResultSummary(data.shareText);
    } catch {
      Alert.alert("No se pudo compartir", "Probá de nuevo en un momento.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={balances}
        keyExtractor={(b) => b.participantId}
        renderItem={({ item }) => <BalanceCard entry={item} />}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <AppText variant="h2">Resultado</AppText>
            {noBudgetLoaded && (
              <AppText variant="caption" style={{ color: colors.textMuted, marginTop: spacing.xs }}>
                Nadie cargó Presupuesto: el gasto se repartió en partes iguales.
              </AppText>
            )}
          </View>
        }
        ListEmptyComponent={
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            Todavía no hay nada para mostrar en esta sesión.
          </AppText>
        }
      />
      <AppButton
        label={sharing ? "Compartiendo..." : "Compartir resultado"}
        onPress={handleShare}
        disabled={sharing || !session}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
});

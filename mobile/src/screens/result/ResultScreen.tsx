import { RouteProp, useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from "react-native";

import { AppButton } from "@/components/common/AppButton";
import { AppText } from "@/components/common/AppText";
import { BalanceCard } from "@/components/result/BalanceCard";
import { BalanceEntry } from "@/domain/models";
import { useSessionResult } from "@/hooks/useSessionResult";
import { TabsParamList } from "@/navigation/types";
import { sessionApi } from "@/services/api/sessionApi";
import { shareResultSummary } from "@/services/whatsapp/shareLink";
import { useSessionStore } from "@/store/sessionStore";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type ResultRouteProp = RouteProp<TabsParamList, "Result">;

// CU-04/CU-04a + RF-14/RF-16: balance final y opción de compartirlo.
export function ResultScreen() {
  const route = useRoute<ResultRouteProp>();
  const sharedToken = route.params?.token;
  const session = useSessionStore((s) => s.session);

  // Deep link de "Compartir resultado" (cuentasclaras://result?token=..., EDT 1.1.4.3): quien
  // abre el link puede no tener esta sesión en su dispositivo (app recién instalada, o un
  // dispositivo distinto), así que el balance se trae solo lectura por shareToken en vez de
  // depender del store local.
  const viewingShared = !!sharedToken && session?.shareToken !== sharedToken;
  const [sharedResult, setSharedResult] = useState<{
    balances: BalanceEntry[];
    noBudgetLoaded: boolean;
  } | null>(null);
  const [sharedError, setSharedError] = useState(false);

  useEffect(() => {
    if (!viewingShared || !sharedToken) return;
    setSharedResult(null);
    setSharedError(false);
    sessionApi
      .getSharedResult(sharedToken)
      .then(({ data }) =>
        setSharedResult({
          balances: data.result.balances,
          noBudgetLoaded: data.result.totals.noBudgetLoaded,
        }),
      )
      .catch(() => setSharedError(true));
  }, [viewingShared, sharedToken]);

  const live = useSessionResult(viewingShared ? "" : (session?.id ?? ""));
  const balances = viewingShared ? (sharedResult?.balances ?? []) : live.balances;
  const noBudgetLoaded = viewingShared
    ? (sharedResult?.noBudgetLoaded ?? false)
    : live.noBudgetLoaded;

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

  if (viewingShared && !sharedResult) {
    return (
      <View style={[styles.container, styles.centered]}>
        {sharedError ? (
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            No se pudo cargar este resultado. Probá abrir el link de nuevo.
          </AppText>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    );
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
      {!viewingShared && (
        <AppButton
          label={sharing ? "Compartiendo..." : "Compartir resultado"}
          onPress={handleShare}
          disabled={sharing || !session}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  centered: { justifyContent: "center", alignItems: "center" },
});

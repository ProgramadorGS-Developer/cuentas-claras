import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { Avatar } from "@/components/common/Avatar";
import { formatCurrency } from "@/utils/formatters";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import { BalanceEntry } from "@/domain/models";

// Tolerancia para considerar "a mano": los saldos vienen redondeados a 2 decimales del servidor.
const SETTLED_EPSILON = 0.005;

// CU-04: muestra cuánto aportó, gastó y debe recibir/pagar cada participante.
export function BalanceCard({ entry }: { entry: BalanceEntry }) {
  const settled = Math.abs(entry.net) < SETTLED_EPSILON;
  const owes = entry.net < 0;

  // Cada texto sigue siendo UN solo bloque ("Debe pagar $ 1.000,00", "Aportó … · Gastó …"):
  // los tests E2E (flujos de Resultado) los buscan con regex sobre el texto completo.
  const balanceLabel = settled
    ? "Está a mano"
    : owes
      ? `Debe pagar ${formatCurrency(Math.abs(entry.net))}`
      : `Debe recibir ${formatCurrency(entry.net)}`;

  const tone = settled
    ? { bg: colors.surface, fg: colors.textMuted }
    : owes
      ? { bg: colors.tintRed, fg: colors.danger }
      : { bg: colors.tintGreen, fg: colors.primaryDark };

  return (
    <View style={[styles.card, shadows.soft]}>
      <View style={styles.header}>
        <Avatar name={entry.participantName} />
        <View style={styles.headerText}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {entry.participantName}
          </AppText>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            Aportó {formatCurrency(entry.contributed)} · Gastó {formatCurrency(entry.spent)}
          </AppText>
        </View>
      </View>
      <View style={[styles.pill, { backgroundColor: tone.bg }]}>
        <AppText variant="bodyBold" style={{ color: tone.fg }}>
          {balanceLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headerText: { flex: 1 },
  pill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
});

import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { AppTextInput } from "@/components/common/AppTextInput";
import { AppButton } from "@/components/common/AppButton";
import { ContributorRow } from "@/components/budget/ContributorRow";
import { WalletIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import { useSessionStore } from "@/store/sessionStore";
import { useUserStore } from "@/store/userStore";
import { useBudget } from "@/hooks/useBudget";
import { isValidPrice } from "@/utils/validators";

// RF-13 (EDT 1.2.3.1): sección "Presupuesto", explícitamente opcional.
export function BudgetScreen() {
  const sessionId = useSessionStore((s) => s.session?.id ?? "");
  const participants = useSessionStore((s) => s.participants);
  const myParticipantId = useUserStore((s) => s.participantId);
  const { contributions, contribute, syncError } = useBudget(sessionId);

  const [amount, setAmount] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState(myParticipantId ?? "");
  const [amountError, setAmountError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nameById = new Map(participants.map((p) => [p.id, p.name]));

  async function handleAdd() {
    if (!isValidPrice(amount)) {
      setAmountError(true);
      return;
    }
    if (!selectedParticipantId) return;

    setSubmitting(true);
    setAmountError(false);
    try {
      await contribute(selectedParticipantId, Number(amount.replace(",", ".")));
      setAmount("");
    } finally {
      setSubmitting(false);
    }
  }

  // Todo vive dentro de la FlatList (formulario como cabecera) para que la pantalla entera
  // scrollee: en celulares chicos, con el teclado abierto, el formulario + la lista de aportes
  // no entraban juntos en una View fija. `header` es un elemento (no un componente inline) para
  // que el TextInput no se remonte —y pierda el foco— en cada render.
  const header = (
    <View>
      <View style={styles.infoBanner}>
        <View style={styles.infoIcon}>
          <WalletIcon size={18} color={colors.onTintBlue} />
        </View>
        <AppText variant="caption" style={styles.infoText}>
          Esta sección es opcional: se puede usar o no.
        </AppText>
      </View>

      <View style={[styles.card, shadows.card]}>
        <AppText variant="bodyBold" style={{ marginBottom: spacing.sm }}>
          ¿Quién aporta?
        </AppText>
        <View style={styles.chipsRow}>
          {participants.map((p) => {
            const selected = p.id === selectedParticipantId;
            return (
              <Pressable
                key={p.id}
                onPress={() => setSelectedParticipantId(p.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <AppText
                  variant="caption"
                  style={selected ? styles.chipTextSelected : styles.chipText}
                >
                  {p.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppTextInput
          placeholder="Monto que aportás"
          keyboardType="numeric"
          value={amount}
          onChangeText={(t) => {
            setAmount(t);
            setAmountError(false);
          }}
          style={{ marginTop: spacing.md }}
        />
        {amountError && (
          <AppText variant="caption" style={{ color: colors.danger, marginTop: spacing.xs }}>
            Ingresá un monto válido (mayor a 0).
          </AppText>
        )}
        {syncError && (
          <AppText variant="caption" style={{ color: colors.danger, marginTop: spacing.xs }}>
            {syncError}
          </AppText>
        )}

        <View style={{ marginTop: spacing.md }}>
          <AppButton
            label={submitting ? "Guardando..." : "Registrar aporte"}
            onPress={handleAdd}
            disabled={submitting || !selectedParticipantId}
          />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <AppText variant="bodyBold">Aportes cargados</AppText>
        {contributions.length > 0 && (
          <View style={styles.countPill}>
            <AppText variant="caption" style={styles.countPillText}>
              {contributions.length}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <FlatList
      data={contributions}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <ContributorRow
          name={nameById.get(item.participantId) ?? "Participante"}
          amount={item.amount}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <WalletIcon size={22} color={colors.onTintOrange} />
          </View>
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            Todavía no se cargó ningún aporte.
          </AppText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.tintBlue,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { flex: 1, color: colors.onTintBlue },
  card: {
    backgroundColor: colors.background,
    borderRadius: 22,
    padding: spacing.lg,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.onPrimary, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  countPill: {
    backgroundColor: colors.tintGreen,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  countPillText: { color: colors.primaryDark, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.tintOrange,
    alignItems: "center",
    justifyContent: "center",
  },
});

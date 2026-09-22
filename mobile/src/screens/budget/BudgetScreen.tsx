import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { AppTextInput } from "@/components/common/AppTextInput";
import { AppButton } from "@/components/common/AppButton";
import { ContributorRow } from "@/components/budget/ContributorRow";
import { colors } from "@/theme/colors";
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

  return (
    <View style={styles.container}>
      <AppText variant="body" style={{ marginBottom: spacing.md }}>
        Esta sección es opcional: se puede usar o no (RF-13).
      </AppText>

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
              <AppText variant="caption" style={selected ? styles.chipTextSelected : styles.chipText}>
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

      <View style={{ marginVertical: spacing.md }}>
        <AppButton
          label={submitting ? "Guardando..." : "Registrar aporte"}
          onPress={handleAdd}
          disabled={submitting || !selectedParticipantId}
        />
      </View>

      <AppText variant="bodyBold" style={{ marginBottom: spacing.xs }}>
        Aportes cargados
      </AppText>
      <FlatList
        data={contributions}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ContributorRow name={nameById.get(item.participantId) ?? "Participante"} amount={item.amount} />
        )}
        ListEmptyComponent={
          <AppText variant="caption" style={{ color: colors.textMuted }}>
            Todavía no se cargó ningún aporte.
          </AppText>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
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
  chipTextSelected: { color: "#fff", fontWeight: "700" },
});

import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { AppTextInput } from "@/components/common/AppTextInput";
import { AppButton } from "@/components/common/AppButton";
import { UsersIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import { splitMeetingExpense } from "@/domain/balanceCalculator";
import { formatCurrency } from "@/utils/formatters";

// RF-15: "gastos en reunión" — división rápida de una cuenta puntual (ej: restaurante), sin
// necesidad de crear una sesión completa.
export function MeetingExpensesScreen() {
  const [total, setTotal] = useState("");
  const [people, setPeople] = useState("");
  // Se guarda junto con lo que se calculó: si después el usuario edita los campos, el resumen
  // ("$ 18.000 ÷ 6 personas") sigue coincidiendo con el monto que se ve, hasta recalcular.
  const [result, setResult] = useState<{ perPerson: number; total: number; people: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  function handleCalculate() {
    const totalAmount = Number(total.replace(",", "."));
    const peopleCount = Number(people);
    const invalid =
      Number.isNaN(totalAmount) ||
      totalAmount <= 0 ||
      !Number.isInteger(peopleCount) ||
      peopleCount < 1;
    if (invalid) {
      // Antes no pasaba nada (o mostraba "$ 0,00 c/u"): ahora se explica qué falta.
      setResult(null);
      setError("Ingresá un total y una cantidad de personas mayores a 0.");
      return;
    }
    setError(null);
    setResult({
      perPerson: splitMeetingExpense(totalAmount, peopleCount),
      total: totalAmount,
      people: peopleCount,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.intro}>
        <View style={styles.iconRing}>
          <UsersIcon size={24} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="h2">Gastos en reunión</AppText>
          <AppText variant="caption" style={styles.muted}>
            Ideal para dividir la cuenta de un restaurante al instante.
          </AppText>
        </View>
      </View>

      <View style={[styles.card, shadows.card]}>
        <AppTextInput
          placeholder="Total de la cuenta"
          keyboardType="numeric"
          value={total}
          onChangeText={(t) => {
            setTotal(t);
            setError(null);
          }}
          style={{ marginBottom: spacing.sm }}
        />
        <AppTextInput
          placeholder="Cantidad de personas"
          keyboardType="number-pad"
          value={people}
          onChangeText={(t) => {
            setPeople(t);
            setError(null);
          }}
          returnKeyType="done"
          onSubmitEditing={handleCalculate}
          style={{ marginBottom: spacing.md }}
        />
        {error ? (
          <AppText variant="caption" style={styles.error}>
            {error}
          </AppText>
        ) : null}
        <AppButton label="Calcular" onPress={handleCalculate} />
      </View>

      {result !== null && (
        <View style={[styles.resultCard, shadows.soft]}>
          <AppText variant="caption" style={styles.resultLabel}>
            Le toca a cada uno
          </AppText>
          {/* Un único bloque de texto: el test E2E (flujo 06) lo busca con una regex ".*c/u". */}
          <AppText variant="h1" style={styles.resultAmount}>
            {formatCurrency(result.perPerson)} c/u
          </AppText>
          <AppText variant="caption" style={styles.resultDetail}>
            {formatCurrency(result.total)} ÷ {result.people}{" "}
            {result.people === 1 ? "persona" : "personas"}
          </AppText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  intro: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  iconRing: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.tintGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: colors.textMuted },
  card: {
    backgroundColor: colors.background,
    borderRadius: 22,
    padding: spacing.lg,
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
  resultCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.tintGreen,
    borderRadius: 22,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  resultLabel: { color: colors.primaryDark, fontWeight: "700", marginBottom: spacing.xs },
  resultAmount: { color: colors.primaryDark, textAlign: "center" },
  resultDetail: { color: colors.textMuted, marginTop: spacing.xs },
});

import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { Avatar } from "@/components/common/Avatar";
import { formatCurrency } from "@/utils/formatters";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";

// RF-13: fila de aportante dentro de la sección Presupuesto (opcional).
export function ContributorRow({ name, amount }: { name: string; amount: number }) {
  return (
    <View style={[styles.row, shadows.soft]}>
      <Avatar name={name} size={36} />
      <AppText variant="bodyBold" style={styles.name} numberOfLines={1}>
        {name}
      </AppText>
      <AppText variant="bodyBold" style={styles.amount}>
        {formatCurrency(amount)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  name: { flex: 1 },
  amount: { color: colors.primaryDark },
});

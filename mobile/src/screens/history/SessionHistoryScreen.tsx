import { FlatList, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { StatusPill } from "@/components/common/StatusPill";
import { ReceiptIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { Pressable } from "react-native";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";
import { goToSession } from "@/navigation/goToSession";

// RF-04 (parte "consulta de sesiones anteriores"). Pantalla independiente accesible
// desde "Ver todas" / "Historial" en el Home.
export function SessionHistoryScreen() {
  const navigation = useNavigation<any>();
  const { active, recent, loading } = useHomeDashboard();
  const all = active ? [active, ...recent] : recent;

  return (
    <View style={styles.container}>
      <FlatList
        data={all}
        keyExtractor={(s) => s.session.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => goToSession(navigation, item.session.id)}
          >
            <View style={styles.iconBubble}>
              <ReceiptIcon size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.info}>
              <AppText variant="bodyBold" numberOfLines={1}>
                {item.session.name}
              </AppText>
              <AppText variant="caption" style={styles.muted}>
                {item.participantCount} {item.participantCount === 1 ? "amigo" : "amigos"} ·{" "}
                {formatDateTime(item.session.createdAt)}
              </AppText>
              <StatusPill label={item.statusLabel} variant={item.status} />
            </View>
            <AppText variant="bodyBold">{formatCurrency(item.totalSpent)}</AppText>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <AppText variant="caption" style={styles.empty}>
              Todavía no hay sesiones para mostrar.
            </AppText>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.lg },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.tintGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 4 },
  muted: { color: colors.textMuted },
  empty: { textAlign: "center", marginTop: spacing.xl, color: colors.textMuted },
});

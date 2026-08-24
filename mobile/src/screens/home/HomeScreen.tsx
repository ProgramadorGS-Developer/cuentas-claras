import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/common/AppText";
import { QuickAction } from "@/components/common/QuickAction";
import { StatusPill } from "@/components/common/StatusPill";
import { ArrowLeftIcon, CartIcon, ReceiptIcon, WalletIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { formatCurrency } from "@/utils/formatters";
import { useHomeDashboard } from "@/hooks/useHomeDashboard";

const cardShadow = Platform.select({
  web: { boxShadow: "0 12px 28px rgba(16,24,40,0.08)" },
  default: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});

// RF-04: Home de la sesión activa (dentro de las tabs). Resume el estado de esta sesión
// puntual y da acceso directo a cargar montos; "Volver al inicio" lleva al dashboard
// general (fuera de las tabs), donde se ve el estado "con/sin sesión activa" (RF-04).
export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { active } = useHomeDashboard();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          style={styles.backLink}
          onPress={() => navigation.navigate("JoinSession")}
        >
          <ArrowLeftIcon size={16} color={colors.primaryDark} />
          <AppText variant="caption" style={styles.backLinkText}>
            Volver al inicio
          </AppText>
        </Pressable>

        {active ? (
          <View style={[styles.card, cardShadow]}>
            <View style={styles.topRow}>
              <View style={styles.iconBubble}>
                <ReceiptIcon size={22} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold" numberOfLines={1}>
                  {active.session.name}
                </AppText>
                <AppText variant="caption" style={styles.muted}>
                  {active.participantCount} {active.participantCount === 1 ? "amigo" : "amigos"}
                </AppText>
              </View>
              <StatusPill label={active.statusLabel} variant={active.status} />
            </View>

            <View style={styles.divider} />

            <View style={styles.totalsRow}>
              <View>
                <AppText variant="caption" style={styles.muted}>
                  Total gastado
                </AppText>
                <AppText variant="h2" style={{ marginBottom: 0 }}>
                  {formatCurrency(active.totalSpent)}
                </AppText>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <AppText variant="caption" style={styles.muted}>
                  Cada uno pone
                </AppText>
                <AppText variant="h2" style={{ marginBottom: 0, color: colors.primaryDark }}>
                  {formatCurrency(active.perPersonShare)}
                </AppText>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <QuickAction
                label="Cargar montos"
                tint={colors.tintOrange}
                icon={<WalletIcon size={22} color="#B45F06" />}
                onPress={() => navigation.navigate("Budget")}
              />
              <QuickAction
                label="Ver lista"
                tint={colors.tintGreen}
                icon={<CartIcon size={22} color={colors.primaryDark} />}
                onPress={() => navigation.navigate("ShoppingList")}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            <AppText variant="bodyBold" style={{ textAlign: "center", marginBottom: spacing.xs }}>
              No hay ninguna sesión activa en este dispositivo
            </AppText>
            <AppText variant="caption" style={[styles.muted, { textAlign: "center" }]}>
              Volvé al inicio para crear o unirte a una.
            </AppText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6F5" },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
    alignSelf: "flex-start",
  },
  backLinkText: { color: colors.primaryDark, fontWeight: "700" },
  card: {
    backgroundColor: colors.background,
    borderRadius: 22,
    padding: spacing.lg,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.tintGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  actionsRow: { flexDirection: "row", gap: spacing.md },
});

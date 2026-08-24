import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { RootStackParamList } from "@/navigation/types";
import { AppText } from "@/components/common/AppText";
import { AppButton } from "@/components/common/AppButton";
import { AppHeader } from "@/components/common/AppHeader";
import { QuickAction } from "@/components/common/QuickAction";
import { StatusPill } from "@/components/common/StatusPill";
import {
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
  ReceiptIcon,
  SettingsIcon,
  UsersIcon,
} from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { sessionApi } from "@/services/api/sessionApi";
import { useHomeDashboard, SessionSummary } from "@/hooks/useHomeDashboard";
import { goToSession } from "@/navigation/goToSession";
import { formatCurrency } from "@/utils/formatters";

type Props = NativeStackScreenProps<RootStackParamList, "JoinSession">;

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

// CU-01: punto de entrada. Cuando llega un token de invitación por WhatsApp, se auto-une (A1/A2
// manejan error o piden nombre). Sin token, esta pantalla actúa como Home: refleja si el
// dispositivo tiene una sesión sin cerrar (RF-04) o invita a crear una nueva.
export function JoinSessionScreen({ route, navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const token = route.params?.token;

  useEffect(() => {
    if (token) handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleJoin() {
    if (!token) return;
    setLoading(true);
    setJoinError(null);
    try {
      const { data: session } = await sessionApi.getByToken(token);
      navigation.replace("EnterName", { sessionId: session.id });
    } catch (e) {
      // A1 (CU-01): link inválido o sesión cerrada/vencida.
      setJoinError("Este link ya no es válido. Puede que la sesión haya sido cerrada o haya vencido.");
    } finally {
      setLoading(false);
    }
  }

  if (token) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <AppText variant="h2" style={{ marginBottom: spacing.sm }}>
          CuentasClaras
        </AppText>
        <AppText variant="caption">Uniéndote a la sesión...</AppText>
        {joinError ? (
          <AppText variant="caption" style={styles.errorText}>
            ⚠ {joinError}
          </AppText>
        ) : null}
      </SafeAreaView>
    );
  }

  return <HomeDashboard />;
}

function HomeDashboard() {
  const navigation = useNavigation<any>();
  const { active, recent } = useHomeDashboard();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, cardShadow]}>
          {active ? <ActiveSessionHero summary={active} /> : <EmptyStateHero />}
        </View>

        <View style={styles.sectionHeaderRow}>
          <AppText variant="h2" style={{ marginBottom: 0 }}>
            Cuentas recientes
          </AppText>
          {recent.length > 0 && (
            <Pressable
              style={styles.seeAllLink}
              onPress={() => navigation.navigate("History")}
            >
              <AppText variant="caption" style={styles.seeAllText}>
                Ver todas
              </AppText>
              <ChevronRightIcon size={16} color={colors.primaryDark} />
            </Pressable>
          )}
        </View>

        {recent.length === 0 ? (
          <AppText variant="caption" style={styles.emptyRecent}>
            Todavía no hay cuentas anteriores.
          </AppText>
        ) : (
          recent.slice(0, 2).map((summary) => (
            <RecentSessionCard key={summary.session.id} summary={summary} />
          ))
        )}
      </ScrollView>

      <View style={styles.ctaArea}>
        <AppButton
          label="Crear nueva cuenta"
          icon={<PlusIcon size={18} color="#fff" />}
          onPress={() => navigation.navigate("NewSession")}
        />
      </View>
    </SafeAreaView>
  );
}

function EmptyStateHero() {
  const navigation = useNavigation<any>();
  return (
    <>
      <View style={styles.emptyBox}>
        <AppText variant="bodyBold" style={styles.emptyBoxTitle}>
          No tenés sesiones activas
        </AppText>
        <AppText variant="caption" style={styles.emptyBoxSubtitle}>
          ¡Creá una nueva cuenta para empezar!
        </AppText>
      </View>
      <View style={styles.actionsRow}>
        <QuickAction
          label="Nueva cuenta"
          tint={colors.tintGreen}
          icon={<PlusIcon size={22} color={colors.primaryDark} />}
          onPress={() => navigation.navigate("NewSession")}
        />
        <QuickAction
          label="Mis grupos"
          tint={colors.tintGreen}
          icon={<UsersIcon size={22} color={colors.primaryDark} />}
          onPress={() => navigation.navigate("History")}
        />
      </View>
    </>
  );
}

function ActiveSessionHero({ summary }: { summary: SessionSummary }) {
  const navigation = useNavigation<any>();
  return (
    <>
      <View style={styles.activeTopRow}>
        <View style={styles.activeIconBubble}>
          <ReceiptIcon size={22} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {summary.session.name}
          </AppText>
          <AppText variant="caption" style={styles.muted}>
            {summary.participantCount} {summary.participantCount === 1 ? "amigo" : "amigos"}
          </AppText>
        </View>
        <StatusPill label={summary.statusLabel} variant={summary.status} />
      </View>

      <View style={styles.divider} />

      <View style={styles.questionRow}>
        <AppText variant="body" style={{ flex: 1 }}>
          ¿Cuánto tiene que poner cada uno?
        </AppText>
        <Pressable
          style={styles.detailButton}
          onPress={() => goToSession(navigation, summary.session.id)}
        >
          <AppText variant="caption" style={styles.detailButtonText}>
            Ver detalle
          </AppText>
          <ChevronRightIcon size={16} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <QuickAction
          label="Historial"
          tint={colors.tintBlue}
          icon={<ClockIcon size={22} color="#2E5C9A" />}
          onPress={() => navigation.navigate("History")}
        />
        <QuickAction
          label="Configuración"
          tint={colors.tintPurple}
          icon={<SettingsIcon size={22} color="#6A4FA0" />}
          onPress={() => navigation.navigate("Settings")}
        />
      </View>
    </>
  );
}

function RecentSessionCard({ summary }: { summary: SessionSummary }) {
  const navigation = useNavigation<any>();
  return (
    <Pressable
      style={[styles.recentCard, cardShadow]}
      onPress={() => goToSession(navigation, summary.session.id)}
    >
      <View style={styles.recentTopRow}>
        <View style={styles.activeIconBubble}>
          <ReceiptIcon size={20} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {summary.session.name}
          </AppText>
          <AppText variant="caption" style={styles.muted}>
            {summary.participantCount} {summary.participantCount === 1 ? "amigo" : "amigos"}
          </AppText>
          <StatusPill label={summary.statusLabel} variant={summary.status} />
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <AppText variant="bodyBold">{formatCurrency(summary.totalSpent)}</AppText>
          <AppText variant="caption" style={styles.muted}>
            Total gastado
          </AppText>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.shareRow}>
        <AppText variant="caption" style={styles.muted}>
          Cada uno debe poner:
        </AppText>
        <View style={styles.sharePill}>
          <AppText variant="bodyBold" style={{ color: colors.primaryDark }}>
            {formatCurrency(summary.perPersonShare)}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6F5" },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  errorText: { color: colors.danger, textAlign: "center", marginTop: spacing.sm },

  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

  heroCard: {
    backgroundColor: colors.background,
    borderRadius: 22,
    padding: spacing.lg,
    marginTop: spacing.xs,
  },

  emptyBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  emptyBoxTitle: { textAlign: "center", marginBottom: 4 },
  emptyBoxSubtitle: { textAlign: "center", color: colors.textMuted },

  actionsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },

  activeTopRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  activeIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.tintGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  questionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  detailButtonText: { color: "#fff", fontWeight: "700" },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  seeAllLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { color: colors.primaryDark, fontWeight: "700" },
  emptyRecent: { color: colors.textMuted, marginTop: spacing.sm },

  recentCard: {
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recentTopRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  shareRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sharePill: {
    backgroundColor: colors.tintGreen,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },

  ctaArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: "#F4F6F5",
  },
});

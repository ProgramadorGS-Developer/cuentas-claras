import { useEffect } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { CloseIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { ReservationNotice } from "@/hooks/useReservation";

interface Props {
  notice: ReservationNotice | null;
  onDismiss: () => void;
}

const cardShadow = Platform.select({
  web: { boxShadow: "0 10px 24px rgba(0,0,0,0.12)" },
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});

// RF-08 / EDT 1.2.2.4: aviso de que otro participante llegó primero a reservar.
// A diferencia del modal viejo (insistir/ceder), esto NO bloquea la pantalla: el arbitraje
// ya se resolvió en el servidor antes de que este aviso aparezca (ver docs/12-...), así que
// acá no hay nada que decidir, solo informar. Se autodescarta a los 4s.
export function ReservationNoticeBanner({ notice, onDismiss }: Props) {
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [notice, onDismiss]);

  if (!notice) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={[styles.banner, cardShadow]}>
        <AppText style={styles.emoji}>😅</AppText>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {notice.itemName}
          </AppText>
          <AppText variant="caption" style={styles.muted}>
            {notice.message}
          </AppText>
        </View>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <CloseIcon size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
  },
  emoji: { fontSize: 22 },
  muted: { color: colors.textMuted },
});

import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { ItemStatusBadge } from "./ItemStatusBadge";
import { ShoppingItem } from "@/domain/models";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { formatCurrency } from "@/utils/formatters";

interface Props {
  item: ShoppingItem;
  participantId: string | null;
  pending: boolean;
  onPress: () => void;
  onReserve: (itemId: string, itemName: string) => void;
  onRelease: (itemId: string) => void;
}

// RF-09/RF-10/EDT 1.2.2.2: fila de la lista dinámica de ítems, con su estado, observación
// (ej: "Reservado por Pedro") y el control de reservar/liberar según de quién sea.
export function ItemRow({ item, participantId, pending, onPress, onReserve, onRelease }: Props) {
  const isMine = !!participantId && item.reservedBy === participantId;
  const isFree = !item.reservedBy;
  const isPurchased = item.status === "comprado";

  const subtitle = isMine ? "Vos lo reservaste" : item.observation;

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyBold">{item.name}</AppText>
        {subtitle ? (
          <AppText variant="caption" style={styles.muted}>
            {subtitle}
          </AppText>
        ) : null}
        <View style={styles.badgeRow}>
          <ItemStatusBadge status={item.status} />
          {isPurchased && item.pricePaid != null ? (
            <AppText variant="caption" style={styles.priceTag}>
              {formatCurrency(item.pricePaid)}
            </AppText>
          ) : null}
        </View>
      </View>

      {!isPurchased && (isFree || isMine) ? (
        <Pressable
          onPress={() => (isFree ? onReserve(item.id, item.name) : onRelease(item.id))}
          disabled={pending}
          style={[styles.actionButton, isFree ? styles.actionReserve : styles.actionRelease]}
        >
          {pending ? (
            <ActivityIndicator size="small" color={isFree ? "#fff" : colors.primaryDark} />
          ) : (
            <AppText
              variant="caption"
              style={{ color: isFree ? "#fff" : colors.primaryDark, fontWeight: "700" }}
            >
              {isFree ? "Reservar" : "Liberar"}
            </AppText>
          )}
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  muted: { color: colors.textMuted, marginBottom: 2 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4 },
  priceTag: { color: colors.primaryDark, fontWeight: "700" },
  actionButton: {
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  actionReserve: { backgroundColor: colors.primary },
  actionRelease: { backgroundColor: colors.tintGreen },
});

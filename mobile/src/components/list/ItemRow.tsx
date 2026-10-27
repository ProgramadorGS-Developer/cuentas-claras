import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { ItemStatusBadge } from "./ItemStatusBadge";
import { ShoppingItem } from "@/domain/models";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { formatCurrency } from "@/utils/formatters";
import { shadows } from "@/theme/shadows";

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
    <Pressable onPress={onPress} style={[styles.row, shadows.soft]}>
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
            <ActivityIndicator
              size="small"
              color={isFree ? colors.onPrimary : colors.primaryDark}
            />
          ) : (
            <AppText
              variant="caption"
              style={{ color: isFree ? colors.onPrimary : colors.primaryDark, fontWeight: "700" }}
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
  // Tarjeta (igual que las filas del Historial) sobre el fondo de la pantalla, en vez de una fila
  // blanca de borde a borde: separa mejor cada ítem sin necesitar líneas divisorias.
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
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

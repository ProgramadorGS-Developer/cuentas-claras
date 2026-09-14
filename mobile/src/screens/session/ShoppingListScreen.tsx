import { FlatList, StyleSheet, View } from "react-native";
import { useSessionStore } from "@/store/sessionStore";
import { useUserStore } from "@/store/userStore";
import { ItemRow } from "@/components/list/ItemRow";
import { ReservationNoticeBanner } from "@/components/list/ReservationNoticeBanner";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useReservation } from "@/hooks/useReservation";
import { useNavigation } from "@react-navigation/native";
import { AppText } from "@/components/common/AppText";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

// RF-05..RF-11 / CU-02 / CU-02a: pantalla principal de la sesión de compra.
export function ShoppingListScreen() {
  const navigation = useNavigation<any>();
  const sessionId = useSessionStore((s) => s.session?.id ?? "");
  const participantId = useUserStore((s) => s.participantId);
  const { items } = useShoppingList(sessionId);
  const { reserve, release, pendingItemId, notice, dismissNotice } = useReservation();

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            participantId={participantId}
            pending={pendingItemId === item.id}
            onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })}
            onReserve={reserve}
            onRelease={release}
          />
        )}
        contentContainerStyle={items.length === 0 ? styles.emptyContent : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <AppText style={styles.emptyEmoji}>🛒</AppText>
            <AppText variant="bodyBold" style={{ textAlign: "center" }}>
              Todavía no hay ítems en esta lista
            </AppText>
          </View>
        }
      />
      <ReservationNoticeBanner notice={notice} onDismiss={dismissNotice} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing.sm, backgroundColor: colors.background },
  emptyContent: { flex: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyEmoji: { fontSize: 36, marginBottom: spacing.sm },
});

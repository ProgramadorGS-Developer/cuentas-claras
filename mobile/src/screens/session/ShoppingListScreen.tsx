import { FlatList, StyleSheet, View } from "react-native";
import { useSessionStore } from "@/store/sessionStore";
import { ItemRow } from "@/components/list/ItemRow";
import { useShoppingList } from "@/hooks/useShoppingList";
import { useNavigation } from "@react-navigation/native";
import { spacing } from "@/theme/spacing";

// RF-05..RF-11 / CU-02 / CU-02a: pantalla principal de la sesión de compra.
// El arbitraje de reserva ya es instantáneo (200/409, ver ItemDetailScreen y
// docs/12-diseno-concurrencia-de-reserva.md): no hay conflicto que negociar acá.
export function ShoppingListScreen() {
  const navigation = useNavigation<any>();
  const sessionId = useSessionStore((s) => s.session?.id ?? "");
  const { items } = useShoppingList(sessionId);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <ItemRow item={item} onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing.sm },
});

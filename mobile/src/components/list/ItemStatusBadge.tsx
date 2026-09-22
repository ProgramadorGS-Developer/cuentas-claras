import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/common/AppText";
import { colors } from "@/theme/colors";
import { ItemStatus } from "@/domain/models";

// RF-09: estado del ítem (pendiente | comprado), siempre visible con alto contraste.
// Estilo pill con tinte, consistente con StatusPill (components/common) usado en el resto de la app.
export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const isPurchased = status === "comprado";
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: isPurchased ? colors.tintGreen : colors.tintOrange },
      ]}
    >
      <AppText
        variant="caption"
        style={{ color: isPurchased ? colors.primaryDark : "#B45F06", fontWeight: "700" }}
      >
        {isPurchased ? "Comprado" : "Pendiente"}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
});

import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import { AppText } from "@/components/common/AppText";
import { AppButton } from "@/components/common/AppButton";
import { AppTextInput } from "@/components/common/AppTextInput";
import { spacing } from "@/theme/spacing";
import { useSessionStore } from "@/store/sessionStore";
import { useReservation } from "@/hooks/useReservation";
import { useUserStore } from "@/store/userStore";
import { itemApi } from "@/services/api/itemApi";
import { isValidPrice } from "@/utils/validators";
import { pickTicketImage, uploadTicket } from "@/services/media/ticketUpload";

type Props = NativeStackScreenProps<RootStackParamList, "ItemDetail">;

// CU-02 (reservar/liberar), CU-03 (marcar comprado + precio + ticket).
export function ItemDetailScreen({ route }: Props) {
  const { itemId } = route.params;
  const item = useSessionStore((s) => s.items.find((i) => i.id === itemId));
  const participantId = useUserStore((s) => s.participantId);
  const { reserve, release } = useReservation();
  const [price, setPrice] = useState("");
  const [priceError, setPriceError] = useState(false);

  if (!item) return null;

  const isMine = item.reservedBy === participantId;
  const isFree = !item.reservedBy;

  function reservationErrorMessage(error: unknown): string {
    return (error as any)?.response?.data?.error ?? "Probá de nuevo en un momento.";
  }

  async function handleReserve() {
    try {
      await reserve(itemId);
    } catch (error) {
      // RF-08: perdió la carrera por el ítem — el servidor ya decidió, no hay nada que negociar.
      Alert.alert("No se pudo reservar", reservationErrorMessage(error));
    }
  }

  async function handleRelease() {
    try {
      await release(itemId);
    } catch (error) {
      Alert.alert("No se pudo liberar la reserva", reservationErrorMessage(error));
    }
  }

  async function handleMarkPurchased() {
    if (!isValidPrice(price) || !participantId) {
      // A2 (CU-03): precio inválido.
      setPriceError(true);
      return;
    }
    await itemApi.markPurchased(itemId, { participantId, pricePaid: Number(price.replace(",", ".")) });
  }

  async function handleAttachTicket() {
    const uri = await pickTicketImage();
    if (uri) await uploadTicket(itemId, uri);
  }

  return (
    <View style={styles.container}>
      <AppText variant="h2">{item.name}</AppText>
      <AppText variant="caption">{item.observation ?? "Sin observaciones"}</AppText>

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {isFree && <AppButton label="Reservar" onPress={handleReserve} />}
        {isMine && item.status === "pendiente" && (
          <>
            <AppButton label="Liberar reserva" variant="secondary" onPress={handleRelease} />
            <AppTextInput
              placeholder="Precio pagado"
              keyboardType="numeric"
              value={price}
              onChangeText={(t) => {
                setPrice(t);
                setPriceError(false);
              }}
            />
            {priceError && (
              <AppText variant="caption" style={{ color: "red" }}>
                Ingresá un precio válido.
              </AppText>
            )}
            <AppButton label="Marcar como comprado" onPress={handleMarkPurchased} />
            <AppButton label="Adjuntar ticket" variant="secondary" onPress={handleAttachTicket} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
});

import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import { AppText } from "@/components/common/AppText";
import { AppButton } from "@/components/common/AppButton";
import { AppTextInput } from "@/components/common/AppTextInput";
import { CameraIcon, ImageIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useSessionStore } from "@/store/sessionStore";
import { useReservation } from "@/hooks/useReservation";
import { useUserStore } from "@/store/userStore";
import { itemApi } from "@/services/api/itemApi";
import { itemRepository } from "@/database/repositories/itemRepository";
import { isValidPrice } from "@/utils/validators";
import { pickTicketImage, uploadTicket } from "@/services/media/ticketUpload";
import { env } from "@/config/env";

type Props = NativeStackScreenProps<RootStackParamList, "ItemDetail">;

// CU-02 (reservar/liberar), CU-03 (marcar comprado + precio + ticket).
export function ItemDetailScreen({ route }: Props) {
  const { itemId } = route.params;
  const item = useSessionStore((s) => s.items.find((i) => i.id === itemId));
  const upsertItem = useSessionStore((s) => s.upsertItem);
  const participantId = useUserStore((s) => s.participantId);
  const { reserve, release, pendingItemId } = useReservation();
  const [price, setPrice] = useState("");
  const [priceError, setPriceError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [uploadingTicket, setUploadingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  if (!item) return null;
  const currentItem = item;

  const isMine = item.reservedBy === participantId;
  const isFree = !item.reservedBy;
  // El backend devuelve una ruta relativa (/uploads/xxx.jpg); acá se arma la URL completa.
  const ticketUri = item.ticketImageUri
    ? item.ticketImageUri.startsWith("http")
      ? item.ticketImageUri
      : `${env.apiUrl}${item.ticketImageUri}`
    : null;

  async function handleMarkPurchased() {
    if (!isValidPrice(price) || !participantId) {
      // A2 (CU-03): precio inválido — solo números positivos.
      setPriceError("Ingresá un precio válido (mayor a 0).");
      return;
    }
    setPurchasing(true);
    setPriceError(null);
    try {
      await itemApi.markPurchased(itemId, {
        participantId,
        pricePaid: Number(price.replace(",", ".")),
      });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) setPriceError("Este ítem ya fue marcado como comprado.");
      else setPriceError("No pudimos guardar el precio. Probá de nuevo.");
    } finally {
      setPurchasing(false);
    }
  }

  async function handleAttachTicket(source: "camera" | "library") {
    setTicketError(null);
    const uri = await pickTicketImage(source);
    if (!uri) return; // canceló o no dio permiso

    setUploadingTicket(true);
    try {
      const ticketImageUri = await uploadTicket(itemId, uri);
      // El endpoint de subida no difunde el cambio por socket (a diferencia de reserve/release/
      // purchase), así que actualizamos el estado local a mano para ver la foto al instante acá
      // mismo; el resto de los dispositivos la va a ver recién cuando se sincronicen de nuevo.
      const updated = { ...currentItem, ticketImageUri, updatedAt: new Date().toISOString() };
      upsertItem(updated);
      itemRepository.upsert(updated).catch(() => {
        // Cacheo local best-effort (ej. sin SQLite en el preview web).
      });
    } catch {
      setTicketError("No pudimos subir la foto. Probá de nuevo.");
    } finally {
      setUploadingTicket(false);
    }
  }

  return (
    <View style={styles.container}>
      <AppText variant="h2">{item.name}</AppText>
      <AppText variant="caption">{item.observation ?? "Sin observaciones"}</AppText>

      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {isFree && (
          <AppButton
            label="Reservar"
            disabled={pendingItemId === itemId}
            onPress={() => reserve(itemId, item.name)}
          />
        )}
        {isMine && item.status === "pendiente" && (
          <>
            <AppButton
              label="Liberar"
              variant="secondary"
              disabled={pendingItemId === itemId}
              onPress={() => release(itemId)}
            />
            <AppTextInput
              placeholder="Precio pagado"
              keyboardType="numeric"
              value={price}
              onChangeText={(t) => {
                setPrice(t);
                setPriceError(null);
              }}
            />
            {priceError && (
              <AppText variant="caption" style={{ color: colors.danger }}>
                {priceError}
              </AppText>
            )}
            <AppButton
              label={purchasing ? "Guardando..." : "Marcar como comprado"}
              disabled={purchasing}
              onPress={handleMarkPurchased}
            />

            <AppText variant="bodyBold" style={{ marginTop: spacing.md }}>
              Foto del ticket
            </AppText>
            {ticketUri ? (
              <Image source={{ uri: ticketUri }} style={styles.ticketPreview} resizeMode="cover" />
            ) : (
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                Todavía no adjuntaste ninguna foto.
              </AppText>
            )}
            <View style={styles.ticketButtonsRow}>
              <View style={{ flex: 1 }}>
                <AppButton
                  label="Cámara"
                  variant="secondary"
                  icon={<CameraIcon size={18} color="#fff" />}
                  disabled={uploadingTicket}
                  onPress={() => handleAttachTicket("camera")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  label="Galería"
                  variant="secondary"
                  icon={<ImageIcon size={18} color="#fff" />}
                  disabled={uploadingTicket}
                  onPress={() => handleAttachTicket("library")}
                />
              </View>
            </View>
            {uploadingTicket && (
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                Subiendo foto...
              </AppText>
            )}
            {ticketError && (
              <AppText variant="caption" style={{ color: colors.danger }}>
                {ticketError}
              </AppText>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  ticketPreview: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  ticketButtonsRow: { flexDirection: "row", gap: spacing.sm },
});

import { useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import { AppText } from "@/components/common/AppText";
import { AppButton } from "@/components/common/AppButton";
import { AppTextInput } from "@/components/common/AppTextInput";
import { ItemStatusBadge } from "@/components/list/ItemStatusBadge";
import { CameraIcon, CheckCircleIcon, ImageIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { shadows } from "@/theme/shadows";
import { spacing } from "@/theme/spacing";
import { useSessionStore } from "@/store/sessionStore";
import { useReservation } from "@/hooks/useReservation";
import { useUserStore } from "@/store/userStore";
import { itemApi } from "@/services/api/itemApi";
import { itemRepository } from "@/database/repositories/itemRepository";
import { isValidPrice } from "@/utils/validators";
import { formatCurrency } from "@/utils/formatters";
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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="h2">{item.name}</AppText>
          <AppText variant="caption" style={styles.muted}>
            {item.observation ?? "Sin observaciones"}
          </AppText>
        </View>
        <ItemStatusBadge status={item.status} />
      </View>

      {isFree && (
        <View style={[styles.card, shadows.card]}>
          <AppText variant="caption" style={styles.muted}>
            Reservalo para avisarle al grupo que lo comprás vos.
          </AppText>
          <AppButton
            label="Reservar"
            disabled={pendingItemId === itemId}
            onPress={() => reserve(itemId, item.name)}
          />
        </View>
      )}

      {isMine && item.status === "pendiente" && (
        <>
          <View style={[styles.card, shadows.card]}>
            <AppText variant="bodyBold">Tu compra</AppText>
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
          </View>

          <View style={[styles.card, shadows.card]}>
            <AppText variant="bodyBold">Foto del ticket</AppText>
            {ticketUri ? (
              <Image
                source={{ uri: ticketUri }}
                style={styles.ticketPreview}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.ticketPlaceholder}>
                <ImageIcon size={26} color={colors.textMuted} />
                <AppText variant="caption" style={styles.muted}>
                  Todavía no adjuntaste ninguna foto.
                </AppText>
              </View>
            )}
            <View style={styles.ticketButtonsRow}>
              <View style={{ flex: 1 }}>
                <AppButton
                  label="Cámara"
                  variant="outline"
                  icon={<CameraIcon size={18} color={colors.primaryDark} />}
                  disabled={uploadingTicket}
                  onPress={() => handleAttachTicket("camera")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  label="Galería"
                  variant="outline"
                  icon={<ImageIcon size={18} color={colors.primaryDark} />}
                  disabled={uploadingTicket}
                  onPress={() => handleAttachTicket("library")}
                />
              </View>
            </View>
            {uploadingTicket && (
              <AppText variant="caption" style={styles.muted}>
                Subiendo foto...
              </AppText>
            )}
            {ticketError && (
              <AppText variant="caption" style={{ color: colors.danger }}>
                {ticketError}
              </AppText>
            )}
          </View>

          {/* Deshacer la reserva es secundario: va aparte y sin relleno, para que no compita con
              "Marcar como comprado". */}
          <AppButton
            label="Liberar"
            variant="outline"
            disabled={pendingItemId === itemId}
            onPress={() => release(itemId)}
          />
        </>
      )}

      {/* Antes, al marcar comprado la pantalla quedaba vacía (todo el bloque dependía de
          status === "pendiente"): ahora se ve lo que quedó registrado. */}
      {item.status === "comprado" && (
        <View style={[styles.card, shadows.card]}>
          <View style={styles.purchasedRow}>
            <View style={styles.purchasedIcon}>
              <CheckCircleIcon size={24} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" style={styles.muted}>
                Compra registrada
              </AppText>
              <AppText variant="h2" style={{ color: colors.primaryDark }}>
                {item.pricePaid != null ? formatCurrency(item.pricePaid) : "Sin precio cargado"}
              </AppText>
            </View>
          </View>
          {ticketUri ? (
            <Image source={{ uri: ticketUri }} style={styles.ticketPreview} resizeMode="contain" />
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  muted: { color: colors.textMuted },
  card: {
    backgroundColor: colors.background,
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  ticketPreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  ticketPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ticketButtonsRow: { flexDirection: "row", gap: spacing.sm },
  purchasedRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  purchasedIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.tintGreen,
    alignItems: "center",
    justifyContent: "center",
  },
});

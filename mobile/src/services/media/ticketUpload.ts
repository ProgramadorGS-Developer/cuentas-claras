import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { httpClient } from "@/services/api/httpClient";

// RF-12 / CU-03 (A1) / EDT 1.2.4.1: escanear (cámara) o adjuntar (galería) el ticket de compra.
export async function pickTicketImage(source: "camera" | "library"): Promise<string | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return null;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false });
    return result.canceled ? null : result.assets[0].uri;
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    base64: false,
  });
  return result.canceled ? null : result.assets[0].uri;
}

// EDT 1.1.5.1: el backend solo acepta WebP. La conversión se hace acá, en el teléfono, para no
// cargar al servidor; un ticket no necesita más de ~1000 px de ancho para leerse bien.
const TICKET_MAX_WIDTH = 1000;
const TICKET_WEBP_QUALITY = 0.5;

async function toWebp(localUri: string): Promise<string> {
  const result = await manipulateAsync(localUri, [{ resize: { width: TICKET_MAX_WIDTH } }], {
    compress: TICKET_WEBP_QUALITY,
    format: SaveFormat.WEBP,
  });
  return result.uri;
}

export async function uploadTicket(itemId: string, localUri: string): Promise<string> {
  const webpUri = await toWebp(localUri);
  const form = new FormData();
  form.append("ticket", {
    uri: webpUri,
    name: `ticket-${itemId}.webp`,
    type: "image/webp",
  } as any);

  const { data } = await httpClient.post(`/items/${itemId}/ticket-upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data.url as string; // URL pública relativa devuelta por el backend (ver server/src/routes/uploads.routes.ts)
}

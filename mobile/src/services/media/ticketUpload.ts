import * as ImagePicker from "expo-image-picker";
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

export async function uploadTicket(itemId: string, localUri: string): Promise<string> {
  const form = new FormData();
  form.append("ticket", {
    uri: localUri,
    name: `ticket-${itemId}.jpg`,
    type: "image/jpeg",
  } as any);

  const { data } = await httpClient.post(`/items/${itemId}/ticket-upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data.url as string; // URL pública relativa devuelta por el backend (ver server/src/routes/uploads.routes.ts)
}

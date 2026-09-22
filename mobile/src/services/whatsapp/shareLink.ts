import { Linking, Share } from "react-native";

// RF-01/RF-03.3.3.1 adaptado a mobile: en vez de la API paga de WhatsApp Business (pensada para el
// backend web original), en la app nativa usamos deep link wa.me y/o el Share sheet del sistema,
// que ya incluye WhatsApp entre las apps disponibles. Ver docs/04-arquitectura.md.

// El mensaje llega ya armado desde el servidor (sessions.controller.create -> shareText): incluye
// el link http(s) de invitación —el único que WhatsApp vuelve clickeable— y, debajo, el de descarga
// de la app. Ver server/src/services/whatsappLink.service.ts.
export async function shareSessionLinkViaWhatsApp(inviteMessage: string) {
  const waUrl = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;

  const canOpen = await Linking.canOpenURL(waUrl);
  if (canOpen) {
    await Linking.openURL(waUrl);
  } else {
    // Fallback: hoja de compartir nativa (funciona sin WhatsApp instalado).
    await Share.share({ message: inviteMessage });
  }
}

// CU-04 / RF-16: compartir la pantalla de resultado.
export async function shareResultSummary(summaryText: string) {
  await Share.share({ message: summaryText });
}

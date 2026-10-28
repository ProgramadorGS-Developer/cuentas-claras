import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  dbFile: process.env.DB_FILE ?? "./data/cuentasclaras.db",
  uploadsDir: process.env.UPLOADS_DIR ?? "./src/uploads",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "https://cuentasclaras.runasp.net",
  // Artefacto del último build de EAS. Se sirve detrás de /descargar (URL propia y estable) para que
  // los links ya compartidos por WhatsApp sigan funcionando al publicar un build nuevo: se cambia
  // esta variable y listo, sin reenviar mensajes.
  apkUrl:
    process.env.APK_URL ??
    "https://expo.dev/artifacts/eas/pzEUL-WNKXprJWd_ecR-wcA7IZSF8dtFi9LISH6g3Go.apk",
};

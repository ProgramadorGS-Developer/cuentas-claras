import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  dbFile: process.env.DB_FILE ?? "./data/cuentasclaras.db",
  uploadsDir: process.env.UPLOADS_DIR ?? "./src/uploads",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "https://cuentasclaras.runasp.net",
};

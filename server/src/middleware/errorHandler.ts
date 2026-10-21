import { NextFunction, Request, Response } from "express";
import multer from "multer";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Errores del cliente que antes caían en 500 (#66): archivo demasiado grande o mal enviado (multer)
  // y body inválido (express.json marca sus errores con un status 4xx, p. ej. 400 JSON malformado).
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "El archivo supera el máximo de 8 MB" });
    return res.status(400).json({ error: "El archivo no se pudo procesar" });
  }
  const { status, type } = (err ?? {}) as { status?: unknown; type?: unknown };
  if (typeof status === "number" && status >= 400 && status < 500) {
    const error = type === "entity.parse.failed" ? "El cuerpo del pedido no es JSON válido" : "Pedido inválido";
    return res.status(status).json({ error });
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}

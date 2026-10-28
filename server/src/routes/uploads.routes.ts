import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { v4 as uuid } from "uuid";
import { config } from "../config/env";
import { db } from "../db/connection";

// RF-12 / EDT 1.1.5.1: subida y almacenamiento de fotos de tickets.
// Para este proyecto académico se guarda en disco local; en producción real se recomienda
// migrar a un bucket externo (S3, Cloudinary) sin cambiar el contrato del endpoint (ver docs/09-despliegue.md).
// La app convierte el ticket a WebP (~1000 px, calidad baja) antes de subirlo, así que 2 MB sobra.
const MAX_TICKET_BYTES = 2 * 1024 * 1024;

// Único formato aceptado: WebP. La extensión sale del mimetype validado, nunca del nombre que manda el cliente.
const EXTENSION_BY_MIMETYPE: Record<string, string> = {
  "image/webp": ".webp",
};

// Firma (primeros bytes) de cada formato. El mimetype lo declara el cliente y no prueba nada: se
// comprueba además que el contenido real empiece como el formato declarado.
// WebP = "RIFF" + 4 bytes de tamaño + "WEBP".
const SIGNATURES: Record<string, (head: Buffer) => boolean> = {
  "image/webp": (head) =>
    head.length >= 12 && head.subarray(0, 4).toString("latin1") === "RIFF" && head.subarray(8, 12).toString("latin1") === "WEBP",
};

function contentMatchesMimetype(filePath: string, mimetype: string): boolean {
  const head = Buffer.alloc(12);
  const fd = fs.openSync(filePath, "r");
  try {
    const bytesRead = fs.readSync(fd, head, 0, head.length, 0);
    return SIGNATURES[mimetype]?.(head.subarray(0, bytesRead)) ?? false;
  } finally {
    fs.closeSync(fd);
  }
}

const storage = multer.diskStorage({
  destination: config.uploadsDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${uuid()}${EXTENSION_BY_MIMETYPE[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_TICKET_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype in EXTENSION_BY_MIMETYPE) return cb(null, true);
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  },
});

export const uploadsRouter = Router();

// Traduce los errores de multer a 4xx claros (el errorHandler global solo devuelve 500).
function handleTicketUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("ticket")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "La imagen supera el máximo de 2 MB" });
      }
      return res.status(400).json({ error: "Formato no permitido: solo se aceptan imágenes WebP" });
    }
    next(err);
  });
}

uploadsRouter.post("/items/:itemId/ticket-upload", handleTicketUpload, (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Falta el archivo 'ticket'" });

  if (!contentMatchesMimetype(req.file.path, req.file.mimetype)) {
    fs.unlink(req.file.path, () => {}); // no dejar en disco un archivo que no es la imagen que dice ser
    return res.status(400).json({ error: "El contenido del archivo no coincide con una imagen WebP" });
  }

  const url = `/uploads/${path.basename(req.file.path)}`;
  const result = db
    .prepare("UPDATE items SET ticket_image_uri = ?, updated_at = ? WHERE id = ?")
    .run(url, new Date().toISOString(), req.params.itemId);

  if (Number(result.changes) === 0) {
    fs.unlink(req.file.path, () => {}); // no dejar huérfana la imagen de un ítem inexistente
    return res.status(404).json({ error: "Ítem no encontrado" });
  }

  res.json({ url });
});

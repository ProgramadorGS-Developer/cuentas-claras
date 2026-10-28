import request from "supertest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { v4 as uuid } from "uuid";

// RF-12 / EDT 1.1.5.1 — subida y almacenamiento de fotos de tickets.
// Las fotos van a una carpeta temporal propia de este archivo (no a server/src/uploads), y se
// configura acá y no en jest.setup.ts para no afectar a los demás tests. app/db se cargan con
// require *después* de fijar UPLOADS_DIR porque config/env.ts lo lee al importarse.
const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), "cuentasclaras-uploads-"));
process.env.UPLOADS_DIR = uploadsDir;
const { app } = require("../../app") as typeof import("../../app");
const { db } = require("../../db/connection") as typeof import("../../db/connection");

afterAll(() => {
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

function seedItem(): string {
  const sessionId = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO sessions (id, name, host_name, created_at, closed_at, share_token) VALUES (?, ?, ?, ?, NULL, ?)`,
  ).run(sessionId, "Asado", "Ana", now, uuid());

  const itemId = uuid();
  db.prepare(`INSERT INTO items (id, session_id, name, status, updated_at) VALUES (?, ?, ?, 'pendiente', ?)`).run(
    itemId,
    sessionId,
    "Carbón",
    now,
  );
  return itemId;
}

function ticketUri(itemId: string): string | null {
  return (db.prepare("SELECT ticket_image_uri FROM items WHERE id = ?").get(itemId) as {
    ticket_image_uri: string | null;
  }).ticket_image_uri;
}

// Cabecera mínima de un WebP ("RIFF" + tamaño + "WEBP"): el endpoint valida la firma, no decodifica la imagen.
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]);
// Cabecera mínima de un PNG, para probar que otros formatos reales se rechazan.
const png = Buffer.from("89504e470d0a1a0a", "hex");

describe("POST /items/:itemId/ticket-upload", () => {
  it("guarda una imagen WebP, la vincula al ítem y es accesible por la URL devuelta", async () => {
    const itemId = seedItem();

    const res = await request(app)
      .post(`/items/${itemId}/ticket-upload`)
      .attach("ticket", webp, { filename: "ticket.webp", contentType: "image/webp" });

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(/^\/uploads\/.+\.webp$/);
    expect(ticketUri(itemId)).toBe(res.body.url);
    expect(fs.existsSync(path.join(uploadsDir, path.basename(res.body.url)))).toBe(true);

    const download = await request(app).get(res.body.url);
    expect(download.status).toBe(200);
  });

  it("rechaza con 400 un JPG o PNG: solo se acepta WebP", async () => {
    const itemId = seedItem();
    const jpg = await request(app)
      .post(`/items/${itemId}/ticket-upload`)
      .attach("ticket", Buffer.from("ffd8ffe0", "hex"), { filename: "ticket.jpg", contentType: "image/jpeg" });
    const pngRes = await request(app)
      .post(`/items/${itemId}/ticket-upload`)
      .attach("ticket", png, { filename: "ticket.png", contentType: "image/png" });

    expect(jpg.status).toBe(400);
    expect(pngRes.status).toBe(400);
    expect(ticketUri(itemId)).toBeNull();
  });

  it("no usa el nombre que manda el cliente para armar el archivo", async () => {
    const itemId = seedItem();
    const res = await request(app)
      .post(`/items/${itemId}/ticket-upload`)
      .attach("ticket", webp, { filename: "mi ticket <raro>.webp", contentType: "image/webp" });

    expect(res.status).toBe(200);
    expect(res.body.url).not.toContain("raro");
    expect(res.body.url).not.toContain(" ");
  });

  it("rechaza con 400 un formato que no es WebP y no toca el ítem", async () => {
    const itemId = seedItem();
    const res = await request(app)
      .post(`/items/${itemId}/ticket-upload`)
      .attach("ticket", Buffer.from("<svg/>"), { filename: "ticket.svg", contentType: "image/svg+xml" });

    expect(res.status).toBe(400);
    expect(ticketUri(itemId)).toBeNull();
  });

  it("rechaza con 400 un archivo que declara ser WebP pero cuyo contenido no lo es, y no deja nada en disco", async () => {
    const itemId = seedItem();
    const before = fs.readdirSync(uploadsDir).length;

    const res = await request(app)
      .post(`/items/${itemId}/ticket-upload`)
      .attach("ticket", Buffer.from("<script>alert(1)</script>"), { filename: "ticket.webp", contentType: "image/webp" });

    expect(res.status).toBe(400);
    expect(ticketUri(itemId)).toBeNull();
    expect(fs.readdirSync(uploadsDir).length).toBe(before);
  });

  it("rechaza con 400 un archivo que declara un formato distinto al de su contenido (WebP declarado, PNG real)", async () => {
    const itemId = seedItem();
    const res = await request(app)
      .post(`/items/${itemId}/ticket-upload`)
      .attach("ticket", png, { filename: "ticket.webp", contentType: "image/webp" });

    expect(res.status).toBe(400);
    expect(ticketUri(itemId)).toBeNull();
  });

  it("rechaza con 413 una imagen de más de 2 MB", async () => {
    const itemId = seedItem();
    const res = await request(app)
      .post(`/items/${itemId}/ticket-upload`)
      .attach("ticket", Buffer.alloc(2 * 1024 * 1024 + 1), { filename: "ticket.webp", contentType: "image/webp" });

    expect(res.status).toBe(413);
    expect(ticketUri(itemId)).toBeNull();
  });

  it("responde 400 si falta el archivo 'ticket'", async () => {
    const itemId = seedItem();
    const res = await request(app).post(`/items/${itemId}/ticket-upload`);

    expect(res.status).toBe(400);
  });

  it("responde 404 si el ítem no existe y no deja la imagen huérfana en disco", async () => {
    const before = fs.readdirSync(uploadsDir).length;

    const res = await request(app)
      .post(`/items/${uuid()}/ticket-upload`)
      .attach("ticket", webp, { filename: "ticket.webp", contentType: "image/webp" });

    expect(res.status).toBe(404);
    expect(fs.readdirSync(uploadsDir).length).toBe(before);
  });
});

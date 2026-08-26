import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config/env";

// Conexión única a la base SQLite del servidor (fuente de verdad para todos los clientes).
fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

export const db = new Database(config.dbFile);
db.pragma("journal_mode = WAL"); // mejor concurrencia de lecturas/escrituras, clave para RF-08.
//Activación de foreign keys para que se cumplan las restricciones de integridad referencial.Pablo Casi.
db.pragma("foreign_keys = ON"); // SQLite no enforcea FKs por defecto; sin esto los REFERENCES del schema son solo documentación.

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

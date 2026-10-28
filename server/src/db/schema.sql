-- Esquema del backend (fuente de verdad compartida por todos los dispositivos).
-- Motor: SQLite (node:sqlite). Ver docs/05-modelo-de-datos.md para el diccionario de datos completo
-- y la justificación de por qué el servidor -y no solo el cliente- necesita su propia SQLite.

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  closed_at TEXT,
  share_token TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  name TEXT NOT NULL,
  is_host INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'comprado')),
  reserved_by TEXT REFERENCES participants(id),
  observation TEXT,
  -- DEUDA (1.1.4.1): sumar CHECK (price_paid IS NULL OR (price_paid >= 0 AND price_paid <= 999999.99)).
  -- Hoy la validación vive solo en items.controller.ts (markPurchased). Aplicarlo acá requiere
  -- recrear la tabla o una migración real (SQLite no soporta ALTER TABLE ADD CONSTRAINT), y como
  -- schema.sql usa CREATE TABLE IF NOT EXISTS no impactaría las bases ya creadas.
  price_paid REAL,
  ticket_image_uri TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS budget_contributions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  participant_id TEXT NOT NULL REFERENCES participants(id),
  -- DEUDA (1.1.4.2): sumar CHECK (amount > 0 AND amount <= 999999.99), misma situación
  -- que items.price_paid: hoy la validación vive solo en budget.controller.ts (contribute).
  amount REAL NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_session ON items(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_budget_contributions_session ON budget_contributions(session_id);

-- Fase 4 de docs/12: la cola de reservas (reservation_attempts) se eliminó; el arbitraje es
-- atómico por REST (reserveItem). Esto limpia las bases ya creadas; es idempotente y también
-- borra su índice.
DROP TABLE IF EXISTS reservation_attempts;

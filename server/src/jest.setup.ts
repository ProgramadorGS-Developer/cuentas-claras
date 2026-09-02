// Corre antes de cargar cualquier módulo de test: fuerza una SQLite en memoria
// para no tocar la base real (server/data/cuentasclaras.db) al testear.
process.env.DB_FILE = ":memory:";

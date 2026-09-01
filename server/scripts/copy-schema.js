const fs = require("node:fs");
const path = require("node:path");

// tsc solo compila archivos .ts a dist/; schema.sql no es TypeScript, así que
// hay que copiarlo a mano para que connection.ts lo encuentre en producción.
const src = path.join(__dirname, "..", "src", "db", "schema.sql");
const dest = path.join(__dirname, "..", "dist", "db", "schema.sql");

fs.copyFileSync(src, dest);

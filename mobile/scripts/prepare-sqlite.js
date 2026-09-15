// expo-sqlite no trae el código fuente de SQLite: su build.gradle lo descarga desde
// www.sqlite.org durante la compilación de Android. Los workers de EAS no alcanzan ese
// host (java.net.SocketException: Network is unreachable), así que el build falla siempre
// en la tarea :expo-sqlite:downloadSQLite.
//
// Esa tarea usa overwrite(false): si el zip ya está en su carpeta de destino, no intenta
// descargarlo. Este script copia ahí la copia versionada en el repo, antes de que Gradle corra.
//
// El nombre del zip está atado a la versión de SQLite que fija expo-sqlite 14.0.6. Si se
// actualiza expo-sqlite, hay que actualizar también el zip de vendor/sqlite/ y este nombre.
const fs = require("fs");
const path = require("path");

const ZIP_NAME = "sqlite-amalgamation-3450300.zip";

const source = path.join(__dirname, "..", "vendor", "sqlite", ZIP_NAME);
const destDir =
  process.env.REACT_NATIVE_DOWNLOADS_DIR ??
  path.join(__dirname, "..", "node_modules", "expo-sqlite", "android", "build", "downloads");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(source, path.join(destDir, ZIP_NAME));

console.log(`SQLite amalgamation lista en ${destDir} (build sin descarga externa)`);

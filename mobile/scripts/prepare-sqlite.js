// expo-sqlite no trae el código fuente de SQLite: su build.gradle lo descarga desde
// www.sqlite.org durante la compilación de Android. Los workers de EAS no alcanzan ese
// host (java.net.SocketException: Network is unreachable), así que el build falla siempre
// en la tarea :expo-sqlite:downloadSQLite.
//
// Esa tarea usa overwrite(false): si el zip ya está en su carpeta de destino, no intenta
// descargarlo. Este script copia ahí la copia versionada en el repo, antes de que Gradle corra.
//
// La carpeta de destino se fija con REACT_NATIVE_DOWNLOADS_DIR (ver eas.json): es la misma
// variable que lee el build.gradle de expo-sqlite, así que ambos lados apuntan al mismo lugar
// en vez de adivinar cada uno por su cuenta. Sin ella, este script escribía en el $buildDir que
// suponía, y bastaba que Gradle resolviera otro (o que algo limpiara build/) para que la tarea
// volviera a intentar la descarga y el build fallara con "Network is unreachable".
//
// Se engancha a `postinstall` y no solo a `eas-build-post-install`: en el build e3a93672 (2026-09-22)
// se comprobó leyendo la fase "Install dependencies" que EAS no ejecuta ese hook — el npm install
// terminaba bien pero este script nunca imprimía nada. `postinstall` lo corre el propio npm, que
// sí se ve en el log. Los dos apuntan acá; correrlo dos veces no molesta porque es idempotente.
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

#!/usr/bin/env python3
"""Genera un reporte PDF de una corrida de Maestro.

Lee los commands.json que Maestro deja en ~/.local/state/maestro/tests/<fecha>/,
arma un HTML y lo imprime a PDF con Chromium headless (sin dependencias de Python).

Uso (desde mobile/):
    python3 .maestro/scripts/reporte-pdf.py                # última corrida
    python3 .maestro/scripts/reporte-pdf.py <dir_corrida>  # una corrida puntual
Salida: ../reportes-e2e/reporte-e2e-<fecha>.pdf (raíz del repo).
"""
import json
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from html import escape as e
from pathlib import Path

MAESTRO_DIR = Path(__file__).resolve().parent.parent
REPO = MAESTRO_DIR.parent.parent
RUNS = Path.home() / ".local/state/maestro/tests"
OUT = REPO / "reportes-e2e"
ART = timezone(timedelta(hours=-3))
OMITIR = {"defineVariablesCommand", "applyConfigurationCommand"}
ESTADO = {"COMPLETED": "OK", "FAILED": "FALLÓ", "SKIPPED": "OMITIDO", "WARNED": "AVISO"}


def objetivo(yaml_path: Path) -> str:
    """Texto de la línea '# Objetivo: ...' del flow (convención de esta carpeta)."""
    if not yaml_path.exists():
        return ""
    m = re.search(r"^# Objetivo:\s*(.+)$", yaml_path.read_text(encoding="utf-8"), re.M)
    return m.group(1).strip() if m else ""


def describir(k, c):
    sel = lambda: c["selector"].get("textRegex", "")
    limpio = lambda t: t.replace("\\", "").replace(".*", "…")
    espera = lambda: " (espera)" if "timeout" in c else ""
    if k == "runFlowCommand":
        nombre = c["sourceDescription"]
        desc = objetivo((MAESTRO_DIR / "flows" / nombre).resolve())
        return f"Preparación: {desc or Path(nombre).stem} (subflow)"
    if k == "launchAppCommand":
        return "Abrir la app con estado limpio" if c.get("clearState") else "Abrir la app"
    if k == "openLinkCommand":
        return f'Abrir link "{c["link"]}"'
    if k == "tapOnElement":
        return f'Tocar "{limpio(sel())}"'
    if k == "assertConditionCommand":
        cond = c["condition"]
        if "notVisible" in cond:
            return f'Verificar que ya no se vea "{limpio(cond["notVisible"]["textRegex"])}"{espera()}'
        return f'Verificar que se vea "{limpio(cond["visible"]["textRegex"])}"{espera()}'
    if k == "pressKeyCommand":
        return "Volver a la pantalla anterior (tecla Back)" if c["code"] == "BACK" else f'Tecla {c["code"]}'
    if k == "inputTextCommand":
        return f'Escribir "{c["text"]}"'
    if k == "eraseTextCommand":
        return "Borrar el texto del campo"
    if k == "hideKeyboardCommand":
        return "Ocultar teclado"
    if k == "scrollUntilVisible":
        return f'Scrollear hasta "{limpio(sel())}"'
    if k == "runScriptCommand":
        env = c.get("env", {})
        if Path(c.get("sourceDescription", "")).name == "anfitrion.js":
            if env.get("ACCION") == "crear-sesion":
                return "Anfitrión (simulado vía API): crea la sesión y comparte el link"
            if env.get("ACCION") == "comprar":
                return f'Anfitrión (simulado vía API): reserva y compra "{env.get("ITEM")}" a ${env.get("PRECIO")}'
        detalle = ", ".join(f"{a}={b}" for a, b in env.items())
        return f'Ejecutar script {Path(c.get("sourceDescription", "")).name}' + (f" ({detalle})" if detalle else "")
    if k == "evalScriptCommand":
        return "Ejecutar script"
    return k


def leer_corrida(run: Path):
    flows, pasos, inicio = {}, [], None
    for d in sorted(p for p in run.iterdir() if (p / "commands.json").exists()):
        flows[d.name] = objetivo(MAESTRO_DIR / "flows" / f"{d.name}.yaml")
        n = 0
        for c in json.loads((d / "commands.json").read_text()):
            k = next(iter(c["command"]))
            m = c["metadata"]
            inicio = min(inicio or m["timestamp"], m["timestamp"])
            if k in OMITIR or m.get("depth", 0) > 0:
                continue
            n += 1
            pasos.append((d.name, n, describir(k, c["command"][k]),
                          ESTADO.get(m["status"], m["status"]), round(m.get("duration", 0) / 1000, 2)))
    return flows, pasos, inicio


def entorno(run: Path, inicio):
    log = (run / "maestro.log").read_text(errors="ignore") if (run / "maestro.log").exists() else ""
    version = re.search(r"Maestro Version: (\S+)", log)
    try:
        modelo = subprocess.run(["adb", "shell", "getprop", "ro.product.model"],
                                capture_output=True, text=True, timeout=5).stdout.strip()
        android = subprocess.run(["adb", "shell", "getprop", "ro.build.version.release"],
                                 capture_output=True, text=True, timeout=5).stdout.strip()
        dispositivo = f"{modelo} (Android {android})" if modelo else "No disponible"
    except (OSError, subprocess.TimeoutExpired):
        dispositivo = "No disponible"
    fecha = datetime.fromtimestamp(inicio / 1000, ART)
    return fecha, [
        ("Proyecto", "CuentasClaras (app mobile)"),
        ("Fecha de ejecución", fecha.strftime("%d/%m/%Y %H:%M") + " (ART)"),
        ("Herramienta", f"Maestro CLI {version.group(1) if version else ''}".strip()),
        ("Dispositivo", dispositivo),
        ("Build", "Dev client (EAS, perfil development)"),
        ("Backend", "Server local (localhost:3000 vía adb reverse)"),
    ]


def html(flows, pasos, fecha, env_rows):
    resumen = []
    for flow, obj in flows.items():
        ps = [p for p in pasos if p[0] == flow]
        ok = sum(p[3] == "OK" for p in ps)
        resumen.append((flow, obj, len(ps), ok, sum(p[4] for p in ps), "PASÓ" if ps and ok == len(ps) else "FALLÓ"))
    pasaron = sum(x[5] == "PASÓ" for x in resumen)
    badge = lambda s: f'<td class="st {"ok" if s in ("OK", "PASÓ") else "bad"}">{e(s)}</td>'

    h = [f"""<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Reporte de pruebas E2E — CuentasClaras</title><style>
@page {{ size: A4; margin: 16mm 18mm; }}
body {{ font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #212121; }}
h1 {{ font-size: 17pt; margin: 0 0 2px; }}
.sub {{ color: #616161; margin-bottom: 12px; }}
h2 {{ font-size: 12pt; color: #2E7D32; margin: 16px 0 6px; border-bottom: 1px solid #C8E6C9; padding-bottom: 2px; }}
table {{ width: 100%; border-collapse: collapse; }}
tr {{ page-break-inside: avoid; }}
th {{ background: #2E7D32; color: #fff; text-align: left; }}
th, td {{ border: 0.5pt solid #BDBDBD; padding: 3px 6px; vertical-align: top; }}
td.n {{ text-align: right; white-space: nowrap; }}
td.st {{ text-align: center; font-weight: bold; white-space: nowrap; }}
td.ok {{ background: #E8F5E9; color: #1B5E20; }} td.bad {{ background: #FFEBEE; color: #B71C1C; }}
tr.tot td {{ font-weight: bold; background: #F5F5F5; }}
.env td:first-child {{ font-weight: bold; width: 32%; }}
ul {{ margin: 4px 0; padding-left: 18px; }} li {{ margin-bottom: 3px; }}
</style></head><body>
<h1>Reporte de pruebas E2E — CuentasClaras</h1>
<div class="sub">Ejecución del {fecha.strftime("%d/%m/%Y %H:%M")} · <b>{pasaron} de {len(resumen)} flows pasaron</b></div>
<h2>Entorno</h2><table class="env">"""]
    h += [f"<tr><td>{e(k)}</td><td>{e(v)}</td></tr>" for k, v in env_rows]
    h.append("</table><h2>Resumen</h2><table><tr><th>Flow</th><th>Objetivo</th><th>Pasos</th>"
             "<th>OK</th><th>Duración (s)</th><th>Resultado</th></tr>")
    for f, o, n, ok, d, r in resumen:
        h.append(f'<tr><td>{e(f)}</td><td>{e(o)}</td><td class="n">{n}</td><td class="n">{ok}</td>'
                 f'<td class="n">{d:.2f}</td>{badge(r)}</tr>')
    h.append(f'<tr class="tot"><td>Total</td><td></td><td class="n">{sum(x[2] for x in resumen)}</td>'
             f'<td class="n">{sum(x[3] for x in resumen)}</td><td class="n">{sum(x[4] for x in resumen):.2f}</td>'
             f'<td class="n">{pasaron}/{len(resumen)}</td></tr></table>')
    for flow in flows:
        h.append(f"<h2>Detalle: {e(flow)}</h2><table><tr><th>#</th><th>Descripción</th>"
                 "<th>Resultado</th><th>Duración (s)</th></tr>")
        h += [f'<tr><td class="n">{p[1]}</td><td>{e(p[2])}</td>{badge(p[3])}<td class="n">{p[4]:.2f}</td></tr>'
              for p in pasos if p[0] == flow]
        h.append("</table>")
    h.append("""<h2>Observaciones</h2><ul>
<li>Las pruebas corren contra un dev client y un backend local, no contra producción, para no escribir datos de prueba en la base compartida.</li>
<li>Cada flow arranca con la app en estado limpio; la preparación (subflows) se agrupa en una sola fila con su duración total.</li>
<li>Los selectores son por texto visible (la app no tiene <i>testID</i>): un cambio de textos en la interfaz puede romper un flow aunque la funcionalidad esté bien.</li>
<li>Las duraciones son las medidas por Maestro en cada paso; no incluyen el arranque de Maestro entre flows.</li>
</ul></body></html>""")
    return "\n".join(h)


def main():
    if len(sys.argv) > 1:
        run = Path(sys.argv[1])
    else:
        corridas = sorted(p for p in RUNS.iterdir() if p.is_dir()) if RUNS.exists() else []
        if not corridas:
            sys.exit(f"No hay corridas de Maestro en {RUNS}")
        run = corridas[-1]
    chromium = shutil.which("chromium") or shutil.which("google-chrome-stable") or shutil.which("google-chrome")
    if not chromium:
        sys.exit("Hace falta Chromium o Chrome para generar el PDF.")

    flows, pasos, inicio = leer_corrida(run)
    if not flows:
        sys.exit(f"{run} no tiene flows con commands.json")
    fecha, env_rows = entorno(run, inicio)

    OUT.mkdir(exist_ok=True)
    pdf = OUT / f"reporte-e2e-{fecha.strftime('%Y-%m-%d_%H%M')}.pdf"
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "reporte.html"
        src.write_text(html(flows, pasos, fecha, env_rows), encoding="utf-8")
        subprocess.run([chromium, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                        f"--print-to-pdf={pdf}", src.as_uri()],
                       check=True, capture_output=True)
    print(pdf)


if __name__ == "__main__":
    main()

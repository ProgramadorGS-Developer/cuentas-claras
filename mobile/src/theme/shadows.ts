import { Platform } from "react-native";

// Sombras compartidas. Antes cada pantalla armaba la suya (5 copias casi idénticas); son los
// mismos tres niveles que ya se usaban, así que centralizarlas no cambia el aspecto.
// En web se usa `boxShadow` (el preview en navegador); en nativo, las props de iOS + elevation de Android.
const SHADOW_COLOR = "#0F172A";

// Burbujas de acción y chips: apenas despegan del fondo.
const soft = Platform.select({
  web: { boxShadow: "0 4px 10px rgba(0,0,0,0.05)" },
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
});

// Tarjetas de contenido (hero, formularios, filas de historial).
const card = Platform.select({
  web: { boxShadow: "0 12px 28px rgba(16,24,40,0.08)" },
  default: {
    shadowColor: SHADOW_COLOR,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});

// Elementos que flotan sobre el contenido (avisos/toasts, botones fijos).
const floating = Platform.select({
  web: { boxShadow: "0 10px 24px rgba(0,0,0,0.12)" },
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});

export const shadows = { soft, card, floating };

import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";
import { colors } from "@/theme/colors";

interface Props {
  name: string;
  size?: number;
  tint?: string;
  color?: string;
}

// Círculo con la inicial del participante. No hay fotos de perfil en la app (solo se pide el
// nombre al entrar, CU-01), así que la inicial es lo que identifica a cada persona de un vistazo.
export function Avatar({
  name,
  size = 40,
  tint = colors.tintGreen,
  color = colors.primaryDark,
}: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: tint },
      ]}
      // La inicial es decorativa: el nombre completo ya se lee al lado.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText variant="bodyBold" style={{ color, fontSize: size * 0.42 }}>
        {initial}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
});

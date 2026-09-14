import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import { AppText } from "@/components/common/AppText";
import { AppTextInput } from "@/components/common/AppTextInput";
import { AppButton } from "@/components/common/AppButton";
import { AppHeader } from "@/components/common/AppHeader";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { isNonEmptyName } from "@/utils/validators";
import { useUserStore } from "@/store/userStore";
import { userRepository } from "@/database/repositories/userRepository";
import { participantApi } from "@/services/api/participantApi";

type Props = NativeStackScreenProps<RootStackParamList, "EnterName">;

// CU-01, pasos 3-5 / RF-02: al entrar por el link solo se pide el nombre.
export function EnterNameScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setUser = useUserStore((s) => s.setUser);

  async function handleContinue() {
    if (!isNonEmptyName(name)) {
      // A2 (CU-01): el sistema vuelve a pedir el nombre.
      setError("Ingresá tu nombre para continuar.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Se registra contra el servidor (no solo local): sin esto, el id de participante nunca
      // llega al backend y reservar/liberar/comprar ítems falla con 404 (ver
      // docs/12-diseno-concurrencia-de-reserva.md).
      const { data: participant } = await participantApi.register(sessionId, name.trim());
      await userRepository.upsert(participant);
      setUser(participant.id, participant.name, participant.isHost);
      navigation.replace("Tabs");
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) setError("Esta sesión ya está cerrada.");
      else if (status === 404) setError("No encontramos esta sesión.");
      else setError("No pudimos conectar con el servidor. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <AppHeader onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <AppText variant="h2" style={{ marginBottom: spacing.md }}>
          ¿Cómo te llamás?
        </AppText>
        <AppTextInput
          placeholder="Tu nombre"
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError(null);
          }}
          style={{ marginBottom: spacing.md, width: "100%" }}
          autoFocus
        />
        {error ? (
          <AppText variant="caption" style={{ color: colors.danger, marginBottom: spacing.sm }}>
            {error}
          </AppText>
        ) : null}
        <AppButton label="Continuar" onPress={handleContinue} disabled={loading} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
});

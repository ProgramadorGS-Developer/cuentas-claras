import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/common/AppText";
import { AppTextInput } from "@/components/common/AppTextInput";
import { AppButton } from "@/components/common/AppButton";
import { AppHeader } from "@/components/common/AppHeader";
import { CloseIcon, PlusIcon, SendIcon } from "@/components/icons/LineIcons";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { sessionApi } from "@/services/api/sessionApi";
import { itemApi } from "@/services/api/itemApi";
import { sessionRepository } from "@/database/repositories/sessionRepository";
import { userRepository } from "@/database/repositories/userRepository";
import { itemRepository } from "@/database/repositories/itemRepository";
import { useUserStore } from "@/store/userStore";
import { useNavigation } from "@react-navigation/native";
import { shareSessionLinkViaWhatsApp } from "@/services/whatsapp/shareLink";
import { generateId } from "@/utils/idGenerator";

// Sugerencias genéricas de compra grupal: no atadas a un solo tipo de evento (asado),
// para que sirvan también en previas, viajes u otras juntadas.
const SUGGESTED_ITEMS = [
  "Bebidas",
  "Hielo",
  "Carbón",
  "Carne",
  "Pan",
  "Verduras",
  "Postre",
  "Vasos y servilletas",
];

// RF-03 / CU (Anfitrión): crear sesión y cargar la lista de compras sugerida.
export function NewSessionScreen() {
  const navigation = useNavigation<any>();
  const setUser = useUserStore((s) => s.setUser);
  const [sessionName, setSessionName] = useState("");
  const [hostName, setHostName] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [draftItem, setDraftItem] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate = sessionName.trim().length > 0 && hostName.trim().length > 0 && !creating;

  function addItem(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    setItems((prev) =>
      prev.some((i) => i.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed],
    );
  }

  function removeItem(name: string) {
    setItems((prev) => prev.filter((i) => i !== name));
  }

  function toggleSuggested(name: string) {
    const already = items.some((i) => i.toLowerCase() === name.toLowerCase());
    if (already) removeItem(name);
    else addItem(name);
  }

  function handleAddDraft() {
    addItem(draftItem);
    setDraftItem("");
  }

  async function handleCreate(shareViaWhatsApp: boolean) {
    if (!canCreate) return;
    setCreating(true);
    try {
      const { data: session } = await sessionApi.create({ name: sessionName, hostName, items });

      // Cachear localmente (offline-first, ver docs/04-arquitectura.md): sin esto, el Home
      // no puede mostrar la sesión recién creada porque siempre lee de SQLite local, nunca del
      // server. Se aísla en su propio try/catch: SQLite no existe en el preview web (expo-sqlite
      // no soporta web), así que ahí fallaría, pero eso no debe frenar la creación de la sesión.
      let hostId: string | null = null;
      try {
        await sessionRepository.upsert(session);
        hostId = await generateId();
        await userRepository.upsert({
          id: hostId,
          sessionId: session.id,
          name: hostName,
          isHost: true,
          joinedAt: session.createdAt,
        });
        const { data: serverItems } = await itemApi.listBySession(session.id);
        for (const item of serverItems) {
          await itemRepository.upsert(item);
        }
      } catch {
        // Falla esperable en el preview web (sin SQLite nativo); en el dispositivo real persiste.
      }
      setUser(hostId ?? session.id, hostName, true);

      if (shareViaWhatsApp) {
        const shareUrl = `cuentasclaras://join?token=${session.shareToken}`;
        await shareSessionLinkViaWhatsApp(shareUrl, session.name);
      }

      navigation.replace("Tabs");
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <AppHeader onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <AppText variant="h2" style={styles.title}>
            Nueva sesión
          </AppText>

          <AppTextInput
            variant="underline"
            placeholder="Nombre de la sesión (ej: Asado del sábado)"
            value={sessionName}
            onChangeText={setSessionName}
            style={styles.field}
          />
          <AppTextInput
            variant="underline"
            placeholder="Tu nombre (anfitrión)"
            value={hostName}
            onChangeText={setHostName}
            style={styles.field}
          />

          <AppText variant="bodyBold" style={styles.sectionLabel}>
            Lista de compras sugerida
          </AppText>

          <View style={styles.addRow}>
            <AppTextInput
              variant="underline"
              placeholder="Agregar un ítem..."
              value={draftItem}
              onChangeText={setDraftItem}
              onSubmitEditing={handleAddDraft}
              returnKeyType="done"
              style={{ flex: 1 }}
            />
            <Pressable
              style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.8 : 1 }]}
              onPress={handleAddDraft}
              hitSlop={8}
            >
              <PlusIcon size={18} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.chipsRow}>
            {SUGGESTED_ITEMS.map((name) => {
              const selected = items.some((i) => i.toLowerCase() === name.toLowerCase());
              return (
                <Pressable
                  key={name}
                  onPress={() => toggleSuggested(name)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <AppText
                    variant="caption"
                    style={selected ? styles.chipTextSelected : styles.chipText}
                  >
                    {name}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {items.length > 0 ? (
            <View style={styles.itemsList}>
              <AppText variant="caption" style={styles.itemsCount}>
                Tu lista ({items.length})
              </AppText>
              {items.map((name) => (
                <View key={name} style={styles.itemRow}>
                  <View style={styles.itemDot} />
                  <AppText variant="body" style={{ flex: 1 }}>
                    {name}
                  </AppText>
                  <Pressable onPress={() => removeItem(name)} hitSlop={8}>
                    <CloseIcon size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="caption" style={styles.emptyHint}>
              Agregá ítems escribiendo arriba o tocando una sugerencia.
            </AppText>
          )}
        </View>

        <View style={styles.actions}>
          <AppButton
            label="Crear e invitar por WhatsApp"
            icon={<SendIcon size={18} color="#fff" />}
            onPress={() => handleCreate(true)}
            disabled={!canCreate}
          />
          <View style={{ height: spacing.sm }} />
          <AppButton
            label="Guardar sesión y agregar gastos"
            variant="info"
            onPress={() => handleCreate(false)}
            disabled={!canCreate}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = Platform.select({
  web: { boxShadow: "0 12px 28px rgba(16,24,40,0.06)" },
  default: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6F5" },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: spacing.lg,
    ...cardShadow,
  },
  title: { marginBottom: spacing.md },
  field: { marginBottom: spacing.md },
  sectionLabel: { marginTop: spacing.sm, marginBottom: spacing.sm },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextSelected: { color: "#fff", fontWeight: "700" },
  itemsList: { marginTop: spacing.lg },
  itemsCount: { color: colors.textMuted, marginBottom: spacing.xs },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyHint: { color: colors.textMuted, marginTop: spacing.md },
  actions: { marginTop: spacing.lg },
});

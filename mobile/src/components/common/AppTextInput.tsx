import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

interface Props extends TextInputProps {
  variant?: "box" | "underline";
}

// Input grande y de alto contraste, en línea con RNF-04.
// Variante "underline": solo línea inferior, para formularios más minimalistas.
export function AppTextInput({ variant = "box", style, ...rest }: Props) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[variant === "box" ? styles.box : styles.underline, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.body.fontSize,
    backgroundColor: colors.surface,
  },
  underline: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    backgroundColor: "transparent",
  },
});

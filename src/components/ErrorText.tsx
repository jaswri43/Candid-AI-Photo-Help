import { StyleSheet, Text } from "react-native";

import { colors, fontSize, spacing } from "../constants/theme";

type Props = {
  children: string;
};

export default function ErrorText({ children }: Props) {
  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  error: {
    color: colors.error,
    fontSize: fontSize.body,
    marginBottom: spacing.md,
    textAlign: "center",
  },
});

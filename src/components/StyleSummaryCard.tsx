import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, fontWeight, radius, spacing } from "../constants/theme";
import { supabase } from "../lib/supabase";

type StyleProfile = {
  subject_position: string;
  camera_angle: string;
  lighting_tone: string;
  framing_tightness: string;
  background_style: string;
  summary_text: string;
};

type Props = {
  profileId: string;
};

const ATTRIBUTE_ROWS: { key: keyof StyleProfile; label: string }[] = [
  { key: "subject_position", label: "Subject position" },
  { key: "camera_angle", label: "Camera angle" },
  { key: "lighting_tone", label: "Lighting tone" },
  { key: "framing_tightness", label: "Framing" },
  { key: "background_style", label: "Background style" },
];

export default function StyleSummaryCard({ profileId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStyleProfile() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("style_profiles")
        .select(
          "subject_position, camera_angle, lighting_tone, framing_tightness, background_style, summary_text"
        )
        .eq("profile_id", profileId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setStyleProfile(null);
      } else {
        setStyleProfile(data);
      }
      setLoading(false);
    }

    fetchStyleProfile();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.statusText}>Loading style profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>Failed to load style profile: {error}</Text>
      </View>
    );
  }

  if (!styleProfile) {
    return (
      <View style={styles.card}>
        <Text style={styles.statusText}>No style profile yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Style Profile</Text>
      <Text style={styles.summary}>{styleProfile.summary_text}</Text>

      {ATTRIBUTE_ROWS.map(({ key, label }) => (
        <View key={key} style={styles.row}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowValue}>{styleProfile[key]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.subheading,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  summary: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.md - 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  rowLabel: {
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: "right",
    marginLeft: spacing.md - 4,
  },
  statusText: {
    fontSize: fontSize.body - 1,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  errorText: {
    fontSize: fontSize.body - 1,
    color: colors.error,
    textAlign: "center",
  },
});

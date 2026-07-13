import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import ErrorText from "../components/ErrorText";
import StyleSummaryCard from "../components/StyleSummaryCard";
import { colors, fontSize, fontWeight, radius, spacing } from "../constants/theme";
import { supabase } from "../lib/supabase";
import { uploadImage } from "../utils/uploadImage";

type Props = {
  profileId: string;
};

export default function HomeScreen({ profileId }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string[] | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const busy = uploading || analysing;

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Candid needs access to your photos to select an image."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    setImageUri(result.assets[0].uri);
    setFeedback(null);
    setScore(null);
    setError(null);
  }

  async function handleAnalyse() {
    if (!imageUri) return;

    setError(null);
    setFeedback(null);
    setScore(null);

    let imageUrl: string;
    setUploading(true);
    try {
      imageUrl = await uploadImage(imageUri);
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : "Failed to upload photo.");
      return;
    }
    setUploading(false);

    setAnalysing(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "feedback",
        { body: { imageUrl, profileId } }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }
      if (!data?.feedback) {
        throw new Error("No feedback returned.");
      }

      setFeedback(data.feedback);
      setScore(typeof data.score === "number" ? data.score : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyse photo.");
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <StyleSummaryCard profileId={profileId} />
        <Text style={styles.title}>Candid</Text>

        <TouchableOpacity style={styles.button} onPress={pickImage} disabled={busy}>
          <Text style={styles.buttonText}>
            {imageUri ? "Choose a different photo" : "Choose a photo"}
          </Text>
        </TouchableOpacity>

        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        )}

        {imageUri && (
          <TouchableOpacity
            style={[styles.button, styles.analyseButton, busy && styles.buttonDisabled]}
            onPress={handleAnalyse}
            disabled={busy}
          >
            {busy ? (
              <View style={styles.row}>
                <ActivityIndicator color={colors.textInverse} />
                <Text style={[styles.buttonText, styles.loadingText]}>
                  {uploading ? "Uploading..." : "Analysing..."}
                </Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Analyse</Text>
            )}
          </TouchableOpacity>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        {score !== null && (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreLabel}>/ 100</Text>
          </View>
        )}

        {feedback && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackTitle}>Feedback</Text>
            {feedback.map((item, index) => (
              <Text key={index} style={styles.feedbackItem}>
                • {item}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg - 4,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    alignSelf: "stretch",
    alignItems: "center",
  },
  analyseButton: {
    backgroundColor: colors.success,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: fontSize.button,
    fontWeight: fontWeight.medium,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingText: {
    marginLeft: spacing.sm,
  },
  preview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.sm,
  },
  scoreValue: {
    fontSize: fontSize.score,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  scoreLabel: {
    fontSize: fontSize.scoreLabel,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  feedbackContainer: {
    alignSelf: "stretch",
    marginTop: spacing.sm,
  },
  feedbackTitle: {
    fontSize: fontSize.subheading,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  feedbackItem: {
    fontSize: fontSize.body,
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 20,
  },
});

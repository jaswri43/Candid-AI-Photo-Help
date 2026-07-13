import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";

import ErrorText from "../components/ErrorText";
import { colors, fontSize, fontWeight, radius, spacing } from "../constants/theme";
import { supabase } from "../lib/supabase";
import { uploadImage } from "../utils/uploadImage";

type Props = {
  profileId: string;
};

export default function CameraScreen({ profileId }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string[] | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const busy = uploading || analysing;

  async function handleCapture() {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setError(null);
        setFeedback(null);
        setScore(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to take photo.");
    }
  }

  function handleRetake() {
    setPhotoUri(null);
    setError(null);
    setFeedback(null);
    setScore(null);
  }

  async function handleUseThisPhoto() {
    if (!photoUri) return;

    setError(null);
    setFeedback(null);
    setScore(null);

    let imageUrl: string;
    setUploading(true);
    try {
      imageUrl = await uploadImage(photoUri);
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

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          <Text style={styles.message}>
            Candid needs camera access to take photos.
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (photoUri) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.container}>
          <Image source={{ uri: photoUri }} style={styles.preview} />

          {!feedback && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.button, styles.retakeButton, busy && styles.buttonDisabled]}
                onPress={handleRetake}
                disabled={busy}
              >
                <Text style={styles.buttonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.useButton, busy && styles.buttonDisabled]}
                onPress={handleUseThisPhoto}
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
                  <Text style={styles.buttonText}>Use This Photo</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {error && <ErrorText>{error}</ErrorText>}

          {feedback && (
            <>
              {score !== null && (
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreValue}>{score}</Text>
                  <Text style={styles.scoreLabel}>/ 100</Text>
                </View>
              )}
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackTitle}>Feedback</Text>
                {feedback.map((item, index) => (
                  <Text key={index} style={styles.feedbackItem}>
                    • {item}
                  </Text>
                ))}
              </View>
              <TouchableOpacity style={styles.button} onPress={handleRetake}>
                <Text style={styles.buttonText}>Take Another Photo</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
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
  message: {
    fontSize: fontSize.button,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
    marginTop: 56,
  },
  camera: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
  },
  preview: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md - 4,
    alignSelf: "stretch",
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
  retakeButton: {
    flex: 1,
    backgroundColor: colors.neutral,
  },
  useButton: {
    flex: 1,
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
    marginBottom: spacing.sm,
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

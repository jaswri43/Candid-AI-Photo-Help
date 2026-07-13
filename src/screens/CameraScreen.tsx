import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

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

  const busy = uploading || analysing;

  async function handleCapture() {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        setError(null);
        setFeedback(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to take photo.");
    }
  }

  function handleRetake() {
    setPhotoUri(null);
    setError(null);
    setFeedback(null);
  }

  async function handleUseThisPhoto() {
    if (!photoUri) return;

    setError(null);
    setFeedback(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyse photo.");
    } finally {
      setAnalysing(false);
    }
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Candid needs camera access to take photos.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (photoUri) {
    return (
      <View style={styles.container}>
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
                  <ActivityIndicator color="#fff" />
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

        {error && <Text style={styles.error}>{error}</Text>}

        {feedback && (
          <>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
        <View style={styles.captureButtonInner} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: "#fff",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
    marginTop: 56,
  },
  camera: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
  },
  preview: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#f3f4f6",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "stretch",
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: "stretch",
    alignItems: "center",
  },
  retakeButton: {
    flex: 1,
    backgroundColor: "#6b7280",
  },
  useButton: {
    flex: 1,
    backgroundColor: "#16a34a",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    marginLeft: 8,
  },
  error: {
    color: "#dc2626",
    marginBottom: 16,
    textAlign: "center",
  },
  feedbackContainer: {
    alignSelf: "stretch",
    marginTop: 8,
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  feedbackItem: {
    fontSize: 15,
    marginBottom: 6,
    lineHeight: 20,
  },
});

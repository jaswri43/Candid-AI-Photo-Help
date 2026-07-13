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

import { supabase } from "../lib/supabase";
import { uploadImage } from "../utils/uploadImage";

export default function HomeScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string[] | null>(null);

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
    setError(null);
  }

  async function handleAnalyse() {
    if (!imageUri) return;

    setError(null);
    setFeedback(null);

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
        { body: { imageUrl } }
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
              <ActivityIndicator color="#fff" />
              <Text style={[styles.buttonText, styles.loadingText]}>
                {uploading ? "Uploading..." : "Analysing..."}
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Analyse</Text>
          )}
        </TouchableOpacity>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

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
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 24,
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
  analyseButton: {
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
  preview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#f3f4f6",
  },
  error: {
    color: "#dc2626",
    marginBottom: 16,
    textAlign: "center",
  },
  feedbackContainer: {
    alignSelf: "stretch",
    marginTop: 8,
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

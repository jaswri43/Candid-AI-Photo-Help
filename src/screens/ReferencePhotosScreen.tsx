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

const MAX_IMAGES = 10;
const MIN_IMAGES = 3;

// TODO: replace with real profile creation UI once that's built.
// Hardcoded to the single profile row that exists for now.
const PLACEHOLDER_PROFILE_ID = "03b30593-5e35-4ec8-b834-1dfd2b7997ab";

export default function ReferencePhotosScreen() {
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [styleProfile, setStyleProfile] = useState<Record<string, unknown> | null>(null);

  const busy = uploading || extracting;

  async function pickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Candid needs access to your photos to select reference photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    setImageUris(result.assets.slice(0, MAX_IMAGES).map((asset) => asset.uri));
    setStyleProfile(null);
    setError(null);
  }

  async function handleGenerate() {
    if (imageUris.length < MIN_IMAGES) {
      setError(`Select at least ${MIN_IMAGES} reference photos.`);
      return;
    }

    setError(null);
    setStyleProfile(null);

    const uploadedUrls: string[] = [];
    setUploading(true);
    try {
      for (let i = 0; i < imageUris.length; i++) {
        setUploadProgress({ current: i + 1, total: imageUris.length });
        const url = await uploadImage(imageUris[i]);
        uploadedUrls.push(url);
      }
    } catch (err) {
      setUploading(false);
      setUploadProgress(null);
      setError(err instanceof Error ? err.message : "Failed to upload photos.");
      return;
    }
    setUploading(false);
    setUploadProgress(null);

    setExtracting(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("extract-style", {
        body: { profileId: PLACEHOLDER_PROFILE_ID, imageUrls: uploadedUrls },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }
      if (!data?.styleProfile) {
        throw new Error("No style profile returned.");
      }

      setStyleProfile(data.styleProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate style profile.");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Reference Photos</Text>

      <TouchableOpacity style={styles.button} onPress={pickImages} disabled={busy}>
        <Text style={styles.buttonText}>
          {imageUris.length > 0 ? "Choose different photos" : "Choose photos"}
        </Text>
      </TouchableOpacity>

      {imageUris.length > 0 && (
        <View style={styles.grid}>
          {imageUris.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.thumbnail} />
          ))}
        </View>
      )}

      {imageUris.length > 0 && (
        <TouchableOpacity
          style={[styles.button, styles.generateButton, busy && styles.buttonDisabled]}
          onPress={handleGenerate}
          disabled={busy}
        >
          {busy ? (
            <View style={styles.row}>
              <ActivityIndicator color="#fff" />
              <Text style={[styles.buttonText, styles.loadingText]}>
                {uploading
                  ? `Uploading photo ${uploadProgress?.current ?? 1} of ${uploadProgress?.total ?? imageUris.length}`
                  : "Generating style profile..."}
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Generate Style Profile</Text>
          )}
        </TouchableOpacity>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {styleProfile && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Style profile saved</Text>
          <Text style={styles.resultText}>{JSON.stringify(styleProfile, null, 2)}</Text>
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
  generateButton: {
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignSelf: "stretch",
    marginBottom: 16,
  },
  thumbnail: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  error: {
    color: "#dc2626",
    marginBottom: 16,
    textAlign: "center",
  },
  resultContainer: {
    alignSelf: "stretch",
    marginTop: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  resultText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "monospace",
  },
});

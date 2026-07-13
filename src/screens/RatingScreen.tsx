import { useEffect, useState } from "react";
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

type Props = {
  profileId: string;
};

export default function RatingScreen({ profileId }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ratedCount, setRatedCount] = useState<number | null>(null);

  const busy = uploading || submitting;

  useEffect(() => {
    fetchRatedCount();
  }, [profileId]);

  async function fetchRatedCount() {
    const { count, error: countError } = await supabase
      .from("rated_photos")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileId);

    if (!countError) {
      setRatedCount(count ?? 0);
    }
  }

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

    setError(null);
    setRating(0);
    setImageUrl(null);
    setImageUri(result.assets[0].uri);

    setUploading(true);
    try {
      const url = await uploadImage(result.assets[0].uri);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (!imageUrl || rating === 0) return;

    setError(null);
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("rated_photos").insert({
        profile_id: profileId,
        image_url: imageUrl,
        rating,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setImageUri(null);
      setImageUrl(null);
      setRating(0);
      await fetchRatedCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit rating.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Rate a Photo</Text>

      <TouchableOpacity style={styles.button} onPress={pickImage} disabled={busy}>
        <Text style={styles.buttonText}>
          {imageUri ? "Choose a different photo" : "Choose a photo"}
        </Text>
      </TouchableOpacity>

      {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}

      {uploading && (
        <View style={styles.row}>
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.loadingText}>Uploading...</Text>
        </View>
      )}

      {imageUrl && !uploading && (
        <>
          <Text style={styles.starPrompt}>How many stars?</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setRating(value)}
                disabled={busy}
                hitSlop={8}
              >
                <Text style={styles.star}>{value <= rating ? "★" : "☆"}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              styles.submitButton,
              (rating === 0 || busy) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || busy}
          >
            {submitting ? (
              <View style={styles.row}>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.buttonText, styles.loadingTextInline]}>Submitting...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Submit Rating</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {ratedCount !== null && (
        <Text style={styles.count}>{ratedCount} photos rated so far</Text>
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
  submitButton: {
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
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 15,
  },
  loadingTextInline: {
    marginLeft: 8,
  },
  preview: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "#f3f4f6",
  },
  starPrompt: {
    fontSize: 16,
    marginBottom: 12,
  },
  starRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  star: {
    fontSize: 40,
    color: "#f59e0b",
  },
  error: {
    color: "#dc2626",
    marginBottom: 16,
    textAlign: "center",
  },
  count: {
    fontSize: 15,
    color: "#6b7280",
    marginTop: 8,
  },
});

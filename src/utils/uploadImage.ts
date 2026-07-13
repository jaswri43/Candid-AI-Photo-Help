import * as ImageManipulator from "expo-image-manipulator";

import { supabase } from "../lib/supabase";

const PHOTOS_BUCKET = "photos";
const MAX_WIDTH = 1200;

function generateFileName(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${random}.jpg`;
}

export async function uploadImage(localUri: string): Promise<string> {
  let processedUri: string;
  try {
    const result = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: MAX_WIDTH } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    processedUri = result.uri;
  } catch (error) {
    throw new Error(
      `Failed to process image at ${localUri}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const fileName = generateFileName();

  let arrayBuffer: ArrayBuffer;
  try {
    const response = await fetch(processedUri);
    arrayBuffer = await response.arrayBuffer();
  } catch (error) {
    throw new Error(
      `Failed to read processed image: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(fileName, arrayBuffer, { contentType: "image/jpeg" });

  if (uploadError) {
    throw new Error(`Failed to upload image to Supabase Storage: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(fileName);

  if (!data?.publicUrl) {
    throw new Error("Failed to retrieve public URL for uploaded image.");
  }

  return data.publicUrl;
}

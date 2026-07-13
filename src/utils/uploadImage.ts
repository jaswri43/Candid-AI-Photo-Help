import { supabase } from "../lib/supabase";

const PHOTOS_BUCKET = "photos";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
  webp: "image/webp",
  gif: "image/gif",
};

function getExtension(uri: string): string {
  const withoutQuery = uri.split(/[?#]/)[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(withoutQuery);
  return match ? match[1].toLowerCase() : "jpg";
}

function generateFileName(extension: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${random}.${extension}`;
}

export async function uploadImage(localUri: string): Promise<string> {
  const extension = getExtension(localUri);
  const contentType = MIME_TYPES[extension] ?? "image/jpeg";
  const fileName = generateFileName(extension);

  let arrayBuffer: ArrayBuffer;
  try {
    const response = await fetch(localUri);
    arrayBuffer = await response.arrayBuffer();
  } catch (error) {
    throw new Error(
      `Failed to read image at ${localUri}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const { error: uploadError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(fileName, arrayBuffer, { contentType });

  if (uploadError) {
    throw new Error(`Failed to upload image to Supabase Storage: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(fileName);

  if (!data?.publicUrl) {
    throw new Error("Failed to retrieve public URL for uploaded image.");
  }

  return data.publicUrl;
}

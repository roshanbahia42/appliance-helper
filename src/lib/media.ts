export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

export function isVideo(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|mov|avi|webm|mkv)$/i.test(file.name);
}

function isHeic(file: File) {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

/**
 * Downscales an image and re-encodes it as JPEG — typically a 10x size reduction
 * while staying sharp enough to diagnose a fault. Also converts HEIC into
 * something every browser can display.
 *
 * Returns the file untouched if it's a video, or if this browser can't decode the
 * format (Chrome and Firefox can't read HEIC), so a failure here never blocks an
 * upload.
 */
export async function compressImage(file: File): Promise<File> {
  if (isVideo(file)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;

    // HEIC is very space-efficient, so the JPEG can come out larger. Convert
    // anyway — being viewable in the dashboard matters more than the extra bytes.
    if (!isHeic(file) && blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

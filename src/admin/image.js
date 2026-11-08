// Shrink photos in the browser before uploading, so phone photos (often 5–10 MB)
// load quickly on the website.
const MAX = 1800;

export async function prepareImage(file) {
  if (file.type === "image/gif" || file.type === "image/svg+xml") return { blob: file, type: file.type };
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`"${file.name}" couldn't be opened. Please use a JPG or PNG photo.`);
  }
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise((res) => canvas.toBlob(res, type, 0.82));
  return { blob, type };
}

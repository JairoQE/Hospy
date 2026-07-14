/**
 * Normaliza cualquier imagen cargable en el navegador a JPEG
 * (evita HEIC/blob vacío o tipos raros de la cámara del celular).
 */
export async function normalizeImageFileForUpload(
  file: File,
  opts?: { maxEdge?: number; quality?: number; fileName?: string },
): Promise<File> {
  const maxEdge = opts?.maxEdge ?? 1920;
  const quality = opts?.quality ?? 0.9;
  const baseName = (opts?.fileName || file.name || "foto").replace(/\.[^.]+$/, "");

  // Ya es JPEG/PNG/WebP pequeño: igual pass por canvas para mime estable
  const bitmap = await createImageBitmap(file).catch(async () => {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadHtmlImage(url);
      return await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  try {
    let { width, height } = bitmap;
    if (width > maxEdge || height > maxEdge) {
      const scale = maxEdge / Math.max(width, height);
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("No se pudo generar la foto."))),
        "image/jpeg",
        quality,
      );
    });

    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen."));
    img.src = src;
  });
}

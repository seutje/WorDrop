export type ImageFraming = { zoom: number; x: number; y: number };
export const DISPLAY_IMAGE_WIDTH = 800;
export const DISPLAY_IMAGE_HEIGHT = 1000;

export function framedImageGeometry(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  framing: ImageFraming,
) {
  const containScale = Math.min(
    frameWidth / imageWidth,
    frameHeight / imageHeight,
  );
  const width = imageWidth * containScale * framing.zoom;
  const height = imageHeight * containScale * framing.zoom;
  return {
    width,
    height,
    left: (frameWidth - width) / 2 + (framing.x * frameWidth) / 2,
    top: (frameHeight - height) / 2 + (framing.y * frameHeight) / 2,
  };
}

export async function renderDisplayImage(
  source: string,
  framing: ImageFraming,
): Promise<string> {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = DISPLAY_IMAGE_WIDTH;
  canvas.height = DISPLAY_IMAGE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image framing is unavailable.");
  context.fillStyle = "#f0eee9";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const geometry = framedImageGeometry(
    image.naturalWidth,
    image.naturalHeight,
    canvas.width,
    canvas.height,
    framing,
  );
  context.drawImage(
    image,
    geometry.left,
    geometry.top,
    geometry.width,
    geometry.height,
  );
  return canvas.toDataURL("image/jpeg", 0.88);
}

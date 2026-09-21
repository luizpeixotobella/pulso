import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { PULSO_IMAGE_STORED_MAX_BYTES, PULSO_IMAGE_UPLOAD_MAX_BYTES } from "@/lib/pulso-alpha";

const ACCEPTED_INPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const QUALITY_STEPS = [82, 74, 66, 58];
const WIDTH_STEPS = [1600, 1360, 1120, 960];

export type StoredPulsoImage = {
  path: string;
  bytes: number;
  sha256: string;
  buffer: Buffer;
};

export async function preparePulsoImage(file: File): Promise<Omit<StoredPulsoImage, "path">> {
  if (!ACCEPTED_INPUT_TYPES.has(file.type)) throw new Error("unsupported_image_type");
  if (file.size < 1 || file.size > PULSO_IMAGE_UPLOAD_MAX_BYTES) throw new Error("image_too_large");
  const input = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(input, { failOn: "warning", limitInputPixels: 20_000_000 }).metadata();
  if (!metadata.width || !metadata.height) throw new Error("invalid_image");

  for (let index = 0; index < QUALITY_STEPS.length; index += 1) {
    const output = await sharp(input, { failOn: "warning", limitInputPixels: 20_000_000 })
      .rotate()
      .resize({
        width: WIDTH_STEPS[index],
        height: WIDTH_STEPS[index],
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY_STEPS[index], effort: 5 })
      .toBuffer();
    if (output.length <= PULSO_IMAGE_STORED_MAX_BYTES) {
      return {
        bytes: output.length,
        sha256: createHash("sha256").update(output).digest("hex"),
        buffer: output,
      };
    }
  }
  throw new Error("image_could_not_be_compressed");
}

export async function storePulsoImage(userId: string, image: Omit<StoredPulsoImage, "path">): Promise<StoredPulsoImage> {
  const path = `${userId}/${randomUUID()}.webp`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from("pulso-media").upload(path, image.buffer, {
    contentType: "image/webp",
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error("image_store_failed");
  return { ...image, path };
}

export async function removePulsoImage(path: string) {
  const admin = createAdminClient();
  await admin.storage.from("pulso-media").remove([path]);
}

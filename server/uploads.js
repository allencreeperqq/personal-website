import { jsonResponse, toHex, normalizeText } from "./http.js";
import { recordUpload } from "./posts.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

const SIGNATURES = [
  { kind: "image", ext: "png", contentType: "image/png", check: (b) => matchBytes(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { kind: "image", ext: "jpg", contentType: "image/jpeg", check: (b) => matchBytes(b, [0xff, 0xd8, 0xff]) },
  { kind: "image", ext: "gif", contentType: "image/gif", check: (b) => matchBytes(b, [0x47, 0x49, 0x46, 0x38]) },
  {
    kind: "image",
    ext: "webp",
    contentType: "image/webp",
    check: (b) => matchBytes(b, [0x52, 0x49, 0x46, 0x46], 0) && matchBytes(b, [0x57, 0x45, 0x42, 0x50], 8)
  },
  { kind: "pdf", ext: "pdf", contentType: "application/pdf", check: (b) => matchBytes(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) }
];

function matchBytes(bytes, signature, offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[offset + i] !== signature[i]) return false;
  }
  return true;
}

function sniffFile(bytes) {
  for (const entry of SIGNATURES) {
    if (entry.check(bytes)) return entry;
  }
  return null;
}

export async function handleUpload(request, env) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return jsonResponse({ ok: false, error: "上傳格式錯誤，請使用檔案表單上傳。" }, 400);
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return jsonResponse({ ok: false, error: "缺少檔案。" }, 400);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const signature = sniffFile(buffer);
  if (!signature) {
    return jsonResponse({ ok: false, error: "不支援的檔案格式，僅接受 PNG / JPG / GIF / WEBP / PDF。" }, 400);
  }

  const maxBytes = signature.kind === "pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (buffer.byteLength > maxBytes) {
    return jsonResponse({ ok: false, error: `檔案過大，${signature.kind === "pdf" ? "PDF" : "圖片"}上限為 ${Math.round(maxBytes / 1024 / 1024)}MB。` }, 400);
  }

  if (!env.UPLOADS) {
    return jsonResponse({ ok: false, error: "R2 綁定尚未設定，請先建立 uploads bucket 並補上 wrangler.json 綁定。" }, 503);
  }

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const randomName = toHex(crypto.getRandomValues(new Uint8Array(12)));
  const r2Key = `uploads/${yyyy}/${mm}/${randomName}.${signature.ext}`;

  await env.UPLOADS.put(r2Key, buffer, {
    httpMetadata: { contentType: signature.contentType }
  });

  await recordUpload(env, {
    r2Key,
    kind: signature.kind,
    originalName: normalizeText(file.name, 200, ""),
    sizeBytes: buffer.byteLength
  });

  return jsonResponse({ ok: true, url: `/api/files/${r2Key}`, key: r2Key, kind: signature.kind });
}

const FILE_KEY_PATTERN = /^uploads\/\d{4}\/\d{2}\/[a-f0-9]{24}\.(png|jpg|gif|webp|pdf)$/;

export async function handleFileGet(env, key) {
  if (!FILE_KEY_PATTERN.test(key)) {
    return jsonResponse({ ok: false, error: "無效的檔案路徑。" }, 400);
  }

  if (!env.UPLOADS) {
    return jsonResponse({ ok: false, error: "R2 綁定尚未設定。" }, 503);
  }

  const object = await env.UPLOADS.get(key);
  if (!object) {
    return jsonResponse({ ok: false, error: "找不到檔案。" }, 404);
  }

  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff"
    }
  });
}

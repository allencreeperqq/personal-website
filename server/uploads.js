import { jsonResponse, toHex, normalizeText } from "./http.js";
import { recordUpload, getStorageUsageBytes } from "./posts.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

// Cloudflare R2 免費額度是 10GB；98% 當硬性上限（保留安全緩衝，避免真的超額被收費），
// 90% 開始在成功上傳的回應裡夾帶警示，讓後台在真的爆掉之前就能提醒你清理。
const R2_FREE_TIER_BYTES = 10 * 1024 * 1024 * 1024;
const STOP_THRESHOLD_BYTES = Math.floor(R2_FREE_TIER_BYTES * 0.98);
const WARN_THRESHOLD_BYTES = Math.floor(R2_FREE_TIER_BYTES * 0.9);

export async function getStorageStatus(env) {
  const usedBytes = await getStorageUsageBytes(env);
  return {
    usedBytes,
    totalBytes: R2_FREE_TIER_BYTES,
    warnThresholdBytes: WARN_THRESHOLD_BYTES,
    stopThresholdBytes: STOP_THRESHOLD_BYTES,
    percent: Math.round((usedBytes / R2_FREE_TIER_BYTES) * 1000) / 10,
    isWarning: usedBytes >= WARN_THRESHOLD_BYTES,
    isStopped: usedBytes >= STOP_THRESHOLD_BYTES
  };
}

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

  const usedBytes = await getStorageUsageBytes(env);
  if (usedBytes + buffer.byteLength >= STOP_THRESHOLD_BYTES) {
    return jsonResponse({
      ok: false,
      error: `儲存空間已接近 Cloudflare R2 免費額度上限（已用 ${(usedBytes / 1024 / 1024 / 1024).toFixed(2)}GB / 10GB），為了避免超額產生費用，已暫停上傳功能。請先清理不需要的檔案。`
    }, 503);
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

  const totalAfterUpload = usedBytes + buffer.byteLength;
  const warning = totalAfterUpload >= WARN_THRESHOLD_BYTES
    ? `提醒：R2 儲存空間已使用 ${(totalAfterUpload / 1024 / 1024 / 1024).toFixed(2)}GB / 10GB，接近免費額度上限，建議清理不需要的檔案。`
    : null;

  return jsonResponse({ ok: true, url: `/api/files/${r2Key}`, key: r2Key, kind: signature.kind, warning });
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

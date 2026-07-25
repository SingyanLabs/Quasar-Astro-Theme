// src/pages/api/albums.ts
import type { APIRoute } from 'astro';
import { ALBUMS_CONFIG } from '../../config';

export const prerender = false; // 必须开启 SSR 动态路由

const RPC_ID = "snAcKc";
const GOOGLE_PHOTOS_MEDIA_HOST = "lh3.googleusercontent.com";
const GOOGLE_PHOTOS_SHARE_URL_BASE = "https://photos.app.goo.gl/";

// ==========================================
// 游标与协议类型定义
// ==========================================
type CursorPayload = {
  albumId: string;
  shareKey: string | null;
  token: string;
  fSid: string;
  bl: string;
  requestId: number;
};

// ==========================================
// Base64Url 安全编解码
// ==========================================
function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf-8').toString('base64').replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4 || 4)) % 4), "=");
  return Buffer.from(padded, 'base64').toString('utf-8');
}
const encodeCursor = (cursor: CursorPayload) => encodeBase64Url(JSON.stringify(cursor));
const decodeCursor = (cursor: string): CursorPayload => JSON.parse(decodeBase64Url(cursor));

// ==========================================
// 核心 API 处理器
// ==========================================
export const GET: APIRoute = async ({ request, url: reqUrl }) => {
  const url = new URL(request.url);
  const mediaUrl = url.searchParams.get("mediaUrl");
  const cursor = url.searchParams.get("cursor");
  const loadedCount = Number.parseInt(url.searchParams.get("loadedCount") || "0", 10);
  const shareId = url.searchParams.get("shareId") || ALBUMS_CONFIG.googleSharedId;
  const shareUrl = `${GOOGLE_PHOTOS_SHARE_URL_BASE}${shareId}`;

  // ----------------------------------------------------
  // 1. 媒体资源反向代理 (Media Proxy) - 现在只代理缩略图了
  // ----------------------------------------------------
  if (mediaUrl) {
    try {
      const parsedUrl = new URL(mediaUrl);
      if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== GOOGLE_PHOTOS_MEDIA_HOST) {
        return new Response("Invalid Google Photos media URL", { status: 400 });
      }

      const forwardedRange = request.headers.get("range");
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,video/*,*/*;q=0.8"
      };
      if (forwardedRange) headers["Range"] = forwardedRange;

      const response = await fetch(mediaUrl, { headers });

      if (!response.ok && response.status !== 206) {
        return new Response("Failed to fetch Google Photos media", { status: response.status });
      }

      const responseHeaders = new Headers({
        "Content-Type": response.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "CDN-Cache-Control": "public, max-age=31536000, immutable",
      });

      const passthroughHeaderNames = ["accept-ranges", "content-length", "content-range", "etag", "last-modified"];
      for (const headerName of passthroughHeaderNames) {
        const headerValue = response.headers.get(headerName);
        if (headerValue) responseHeaders.set(headerName, headerValue);
      }

      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch (error) {
      return new Response("Error fetching Google Photos media", { status: 500 });
    }
  }

  // ----------------------------------------------------
  // 2. Cursor 游标相册数据抓取
  // ----------------------------------------------------
  try {
    const originUrl = reqUrl.origin;
    let nextCursorToken: string | null = null;
    let parsedPhotos: any[] = [];
    
    if (cursor) {
      const cursorPayload = decodeCursor(cursor);
      
      const endpoint = new URL("https://photos.google.com/_/PhotosUi/data/batchexecute");
      endpoint.search = new URLSearchParams({
        rpcids: RPC_ID,
        "source-path": `/share/${cursorPayload.albumId}`,
        "f.sid": cursorPayload.fSid,
        bl: cursorPayload.bl,
        hl: "en-US",
        "soc-app": "165",
        "soc-platform": "1",
        "soc-device": "1",
        _reqid: String(cursorPayload.requestId),
        rt: "c",
      }).toString();

      const body = new URLSearchParams({
        "f.req": JSON.stringify([
          [[RPC_ID, JSON.stringify([cursorPayload.albumId, cursorPayload.token, null, cursorPayload.shareKey]), null, "generic"]],
        ]),
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "x-same-domain": "1",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        },
        body,
      });

      const text = await response.text();
      const pageData = parseBatchExecuteResponse(text);
      
      parsedPhotos = toPhotoItems(pageData[1], loadedCount, originUrl);
      const nextToken = pageData[2] || "";
      
      nextCursorToken = nextToken ? encodeCursor({
        ...cursorPayload,
        token: nextToken,
        requestId: cursorPayload.requestId + 100000,
      }) : null;

    } else {
      const response = await fetch(shareUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow"
      });
      
      const html = await response.text();
      const resolvedUrl = response.url;
      
      const initData = parseInitDataAsync(html);
      const globalData = parseGlobalData(html);
      const albumId = initData[3]?.[0];
      
      if (typeof albumId !== "string") throw new Error("Could not find album id");
      
      const albumShareKey = initData[3]?.[19];
      const shareKey = (typeof albumShareKey === "string" && albumShareKey) ? albumShareKey : new URL(resolvedUrl).searchParams.get("key");
      
      parsedPhotos = toPhotoItems(initData[1], 0, originUrl);
      const nextToken = initData[2] || "";
      
      nextCursorToken = nextToken ? encodeCursor({
        albumId,
        shareKey,
        token: nextToken,
        fSid: globalData.FdrFJe,
        bl: globalData.cfb2h,
        requestId: 100000,
      }) : null;
    }

    return new Response(JSON.stringify({
      photos: parsedPhotos,
      nextCursor: nextCursorToken
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": cursor ? "public, s-maxage=3600" : "public, s-maxage=300",
        "CDN-Cache-Control": cursor ? "public, max-age=3600" : "public, max-age=300",
      },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: "获取相册失败", message: error.message }), { status: 500 });
  }
};

// ==========================================
// Google HTML 与 Payload 解析工具函数
// ==========================================
function parseInitDataAsync(html: string) {
  const callbackScriptPattern = /<script class="(ds:\d+)"[^>]*>(AF_initDataCallback\(\{[\s\S]*?\}\);)<\/script>/g;
  let match;
  while ((match = callbackScriptPattern.exec(html))) {
    const callbackScript = match[2];
    const dataIndex = callbackScript.indexOf("data:");
    const sideChannelIndex = callbackScript.lastIndexOf(", sideChannel:");
    const callbackEndIndex = callbackScript.lastIndexOf("});");
    const dataEndIndex = sideChannelIndex > dataIndex ? sideChannelIndex : callbackEndIndex > dataIndex ? callbackEndIndex : -1;
    
    if (dataIndex !== -1 && dataEndIndex !== -1 && dataEndIndex > dataIndex) {
      const rawData = callbackScript.slice(dataIndex + 5, dataEndIndex).trim().replace(/,\s*$/, "");
      const data = JSON.parse(rawData);
      if (Array.isArray(data?.[1]) && Array.isArray(data?.[3])) return data;
    }
  }
  throw new Error("Could not find initData");
}

function parseGlobalData(html: string) {
  const match = html.match(/window\.WIZ_global_data = (\{.*?\});<\/script>/s);
  if (!match) throw new Error("Could not find global data");
  return JSON.parse(match[1]);
}

function parseBatchExecuteResponse(text: string) {
  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (!line.startsWith("[")) continue;
    try {
      const payload = JSON.parse(line);
      const entry = payload.find((item: any) => item?.[0] === "wrb.fr" && item?.[1] === RPC_ID);
      if (typeof entry?.[2] === "string") return JSON.parse(entry[2]);
    } catch {}
  }
  throw new Error("Could not parse page response");
}

function localGooglePhotosMediaUrl(mediaUrl: string, origin: string) {
  return `${origin}/api/albums?mediaUrl=${encodeURIComponent(mediaUrl)}`;
}

// 🌟 节省带宽：区分服务端代理图与客户端直连图
function toPhotoItems(items: any[], startIndex = 0, originUrl = "") {
  if (!Array.isArray(items)) return [];
  
  return items.map((item, itemIndex) => {
    const media = item[1];
    const metadata = item[9];
    const videoMetadata = metadata?.["76647426"];
    const baseUrl = media?.[0];
    const width = typeof media?.[1] === "number" ? media[1] : null;
    const height = typeof media?.[2] === "number" ? media[2] : null;
    const takenMs = typeof item[2] === "number" ? item[2] : null;
    const durationMs = typeof videoMetadata?.[0] === "number" ? videoMetadata[0] : null;
    const mediaType = durationMs ? "video" : "photo";

    if (typeof item[0] !== "string" || typeof baseUrl !== "string" || !baseUrl.startsWith("https://lh3.googleusercontent.com/")) {
      return null;
    }

    const proxyUrl = (params: string) => localGooglePhotosMediaUrl(`${baseUrl}=${params}`, originUrl);
    const directUrl = (params: string) => `${baseUrl}=${params}`; // 客户端浏览器直连生成器

    return {
      index: startIndex + itemIndex + 1,
      id: item[0],
      mediaType,
      baseUrl,
      width,
      height,
      takenAt: takenMs ? new Date(takenMs).toISOString() : null,
      durationMs,
      // 🌟 [关键更改] 只有缩略图走代理，节省海量带宽
      thumbUrl: proxyUrl("w800-no"),
      fallbackThumbUrl: proxyUrl("w500-no"),
      
      // 🌟 [关键更改] 大图预览与视频，全部交给浏览器自身直连！连不上就报错！
      displayUrl: directUrl("w1600-no"),
      fallbackDisplayUrl: directUrl("w1200-no"),
      previewUrl: directUrl("w1024-no"),
      fallbackPreviewUrl: directUrl("w800-no"),
      originalLikeUrl: (mediaType === "photo" && width && height) ? directUrl(`w${width}-h${height}-no`) : directUrl("w2400-no"),
      fallbackOriginalLikeUrl: directUrl("w1600-no"),
      videoUrl: mediaType === "video" ? directUrl("dv") : null,
      fallbackVideoUrl: mediaType === "video" ? directUrl("m22") : null
    };
  }).filter(Boolean);
}
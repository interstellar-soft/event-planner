const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const dbPath = path.join(root, "data", "db.json");
const generatedDir = path.join(root, "generated");
const port = Number(process.env.PORT || 3000);
const adminPassword = process.env.ADMIN_PASSWORD || "tony-admin";
const openAiApiKey = process.env.OPENAI_API_KEY || "";
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || "";
const openAiApiBaseUrl = process.env.OPENAI_API_BASE_URL || "https://api.openai.com";
const elevenLabsApiBaseUrl = process.env.ELEVENLABS_API_BASE_URL || "https://api.elevenlabs.io";
const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  apiKey: process.env.CLOUDINARY_API_KEY || "",
  apiSecret: process.env.CLOUDINARY_API_SECRET || ""
};
const maxCoverGenerations = Number(process.env.MAX_COVER_GENERATIONS || 6);
const maxMusicGenerations = Number(process.env.MAX_MUSIC_GENERATIONS || 3);
const sessions = new Set();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
  ".toml": "text/plain; charset=utf-8"
};

function readDb() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  db.invitations = Array.isArray(db.invitations) ? db.invitations : [];
  db.rsvps = Array.isArray(db.rsvps) ? db.rsvps : [];
  db.bookings = Array.isArray(db.bookings) ? db.bookings : [];
  return db;
}

function writeDb(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function ensureDb() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dbPath)) {
    writeDb({ invitations: [], rsvps: [], bookings: [] });
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function json(res, status, payload) {
  send(res, status, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
}

function redirect(res, location) {
  send(res, 302, "", { Location: location });
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const index = cookie.indexOf("=");
        return [cookie.slice(0, index), decodeURIComponent(cookie.slice(index + 1))];
      })
  );
}

function isAuthed(req) {
  const token = parseCookies(req).tony_admin;
  return Boolean(token && sessions.has(token));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function safeSlug(value) {
  const base = String(value || "event")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 52);
  return base || "event";
}

function uniqueSlug(db, title) {
  const base = safeSlug(title);
  let slug = base;
  let counter = 2;
  while (db.invitations.some((invite) => invite.slug === slug)) {
    slug = `${base}-${counter}`;
    counter += 1;
  }
  return slug;
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}

function safePublicUrl(value, { allowLocal = false } = {}) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (allowLocal && (raw.startsWith("/assets/") || raw.startsWith("/generated/"))) return raw;
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function generationConfig() {
  return {
    coverEnabled: Boolean(openAiApiKey),
    musicEnabled: Boolean(elevenLabsApiKey),
    permanentStorage: Boolean(cloudinaryConfig.cloudName && cloudinaryConfig.apiKey && cloudinaryConfig.apiSecret),
    storage: cloudinaryConfig.cloudName && cloudinaryConfig.apiKey && cloudinaryConfig.apiSecret ? "cloudinary" : "local-temporary",
    maxCoverGenerations,
    maxMusicGenerations
  };
}

function getGenerationUsage(invitation) {
  invitation.generationUsage = invitation.generationUsage || { covers: 0, music: 0 };
  invitation.generatedCovers = Array.isArray(invitation.generatedCovers) ? invitation.generatedCovers : [];
  invitation.generatedTracks = Array.isArray(invitation.generatedTracks) ? invitation.generatedTracks : [];
  return invitation.generationUsage;
}

function providerError(message, status = 502) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") throw providerError("Generation timed out. Please try again.", 504);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function uploadToCloudinary(buffer, mimeType, invitation, kind) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "tony-event-platform";
  const publicId = `${safeSlug(invitation.slug)}-${kind}-${timestamp}`;
  const signaturePayload = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${cloudinaryConfig.apiSecret}`;
  const signature = crypto.createHash("sha1").update(signaturePayload).digest("hex");
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), publicId);
  form.append("api_key", cloudinaryConfig.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("signature", signature);
  const resourceType = kind === "music" ? "video" : "image";
  const response = await fetchWithTimeout(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/${resourceType}/upload`,
    { method: "POST", body: form },
    120_000
  );
  const result = await response.json();
  if (!response.ok || !result.secure_url) {
    throw providerError(result.error?.message || "Cloud storage upload failed.");
  }
  return result.secure_url;
}

async function persistGeneratedAsset(buffer, extension, mimeType, invitation, kind) {
  if (generationConfig().permanentStorage) {
    return uploadToCloudinary(buffer, mimeType, invitation, kind);
  }
  if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });
  const filename = `${safeSlug(invitation.slug)}-${kind}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.${extension}`;
  fs.writeFileSync(path.join(generatedDir, filename), buffer);
  return `/generated/${filename}`;
}

function buildCoverPrompt(invitation, direction) {
  const themeNames = { ivory: "ivory garden", midnight: "midnight charcoal and refined gold", sage: "sage green and soft botanical" };
  return [
    "Create a premium vertical background artwork for a digital event invitation.",
    `Event: ${invitation.eventType || "celebration"}. Venue mood: ${invitation.venue || "elegant venue"}.`,
    `Visual direction: ${direction}. Palette and style: ${themeNames[invitation.theme] || themeNames.ivory}.`,
    "Portrait composition with generous calm negative space in the center for HTML invitation text.",
    "No words, no letters, no numbers, no logos, no watermarks, no borders, and no identifiable people or faces.",
    "Sophisticated editorial photography and fine-art styling, realistic texture, suitable for a luxury Lebanese event studio."
  ].join(" ");
}

function buildMusicPrompt(invitation, direction) {
  return [
    `Create an original instrumental background track for a ${invitation.eventType || "celebration"} digital invitation.`,
    `Creative direction: ${direction}.`,
    "Elegant, warm, cinematic, emotionally uplifting, gentle opening and graceful resolved ending.",
    "No vocals, no spoken words, no recognizable copyrighted melodies, and no imitation of any named artist.",
    "Keep the arrangement refined and unobtrusive so invitation details remain the focus."
  ].join(" ");
}

async function generateCover(invitation, direction, quality) {
  const response = await fetchWithTimeout(`${openAiApiBaseUrl}/v1/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt: buildCoverPrompt(invitation, direction),
      size: "1024x1536",
      quality: ["low", "medium", "high"].includes(quality) ? quality : "medium",
      output_format: "webp",
      output_compression: 86,
      n: 1
    })
  }, 150_000);
  const result = await response.json();
  if (!response.ok) {
    throw providerError(result.error?.message || "Cover generation failed.", response.status >= 500 ? 502 : 400);
  }
  const encoded = result.data?.[0]?.b64_json;
  if (!encoded) throw providerError("The image provider returned no image.");
  return persistGeneratedAsset(Buffer.from(encoded, "base64"), "webp", "image/webp", invitation, "cover");
}

async function generateMusic(invitation, direction, durationSeconds) {
  const response = await fetchWithTimeout(
    `${elevenLabsApiBaseUrl}/v1/music?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: buildMusicPrompt(invitation, direction),
        music_length_ms: durationSeconds * 1000,
        model_id: process.env.ELEVENLABS_MUSIC_MODEL || "music_v1",
        force_instrumental: true,
        sign_with_c2pa: true
      })
    },
    180_000
  );
  if (!response.ok) {
    let message = "Soundtrack generation failed.";
    try {
      const result = await response.json();
      message = result.detail?.message || result.detail?.status || result.message || message;
    } catch {}
    throw providerError(message, response.status >= 500 ? 502 : 400);
  }
  return persistGeneratedAsset(Buffer.from(await response.arrayBuffer()), "mp3", "audio/mpeg", invitation, "music");
}

function invitationStatus(value) {
  return ["draft", "approved", "published"].includes(value) ? value : "draft";
}

function serveFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, requested));
  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, content, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": requested.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache"
    });
  });
}

function invitePage(invite, isPreview = false) {
  const title = escapeHtml(invite.title);
  const theme = ["ivory", "midnight", "sage"].includes(invite.theme) ? invite.theme : "ivory";
  const coverImageUrl = safePublicUrl(invite.coverImageUrl, { allowLocal: true });
  const musicUrl = safePublicUrl(invite.musicUrl, { allowLocal: true });
  const hostNames = escapeHtml(invite.hostNames || "Together with their families");
  const message = escapeHtml(invite.message || "We would be delighted to celebrate this special occasion with you.");
  const backgroundStyle = coverImageUrl ? ` style="--invite-cover: url('${escapeHtml(coverImageUrl)}')"` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} | Digital Invitation</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="invite-public-body invite-theme-${theme}"${backgroundStyle}>
    <main class="invite-public-page">
      <section class="invite-public-card">
        ${isPreview ? `<div class="invite-preview-banner">Private admin preview</div>` : ""}
        <p class="invite-kicker">${escapeHtml(invite.eventType || "Event Invitation")}</p>
        <p class="invite-hosts">${hostNames}</p>
        <h1>${title}</h1>
        <p class="invite-message">${message}</p>
        <div class="invite-details">
        <p>${escapeHtml(invite.date)}</p>
        <p>${escapeHtml(invite.venue)}</p>
        </div>
        ${invite.mapUrl ? `<a class="button outline" href="${escapeHtml(invite.mapUrl)}" target="_blank" rel="noopener noreferrer">Open Location</a>` : ""}
        ${musicUrl ? `<audio class="invite-audio" controls preload="none" src="${escapeHtml(musicUrl)}">Your browser does not support audio playback.</audio>` : ""}
        ${invite.rsvpDeadline ? `<p class="invite-deadline">Kindly respond by ${escapeHtml(invite.rsvpDeadline)}</p>` : ""}
        ${invite.showRsvp === false ? "" : `
        <form class="rsvp-form public-rsvp-form" id="publicRsvpForm">
          <input type="hidden" id="inviteId" value="${escapeHtml(invite.id)}" />
          <label>Full name <input id="rsvpName" required /></label>
          <label>Phone <input id="rsvpPhone" type="tel" /></label>
          <label>Guests attending <input id="rsvpCount" type="number" min="0" value="1" /></label>
          <label>Response
            <select id="rsvpStatus">
              <option value="attending">Attending</option>
              <option value="not-attending">Not attending</option>
            </select>
          </label>
          <button class="button primary full" type="submit">Send RSVP</button>
          <p class="form-note" id="rsvpStatusMessage" role="status"></p>
        </form>
        `}
      </section>
    </main>
    ${invite.showRsvp === false ? "" : `<script src="/invite.js"></script>`}
  </body>
</html>`;
}

function adminPage() {
  if (!fs.existsSync(path.join(root, "admin.html"))) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Admin</title><link rel="stylesheet" href="/styles.css"></head><body><main class="admin-page"><div class="admin-shell"><h1>Admin dashboard missing</h1><p>Create admin.html to manage this site.</p></div></main></body></html>`;
  }
  return fs.readFileSync(path.join(root, "admin.html"), "utf8");
}

async function handleApi(req, res, pathname) {
  try {
    if (req.method === "POST" && pathname === "/api/login") {
      const body = await readBody(req);
      if (body.password !== adminPassword) {
        json(res, 401, { error: "Invalid password" });
        return;
      }
      const token = createId("session");
      sessions.add(token);
      send(res, 200, JSON.stringify({ ok: true }), {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": `tony_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/logout") {
      const token = parseCookies(req).tony_admin;
      if (token) sessions.delete(token);
      send(res, 200, JSON.stringify({ ok: true }), {
        "Content-Type": "application/json; charset=utf-8",
        "Set-Cookie": "tony_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/admin") {
      if (!isAuthed(req)) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }
      json(res, 200, { ...readDb(), generationConfig: generationConfig() });
      return;
    }

    if (req.method === "POST" && pathname === "/api/invitations") {
      const body = await readBody(req);
      const db = readDb();
      const invitation = {
        id: createId("invite"),
        slug: uniqueSlug(db, body.title),
        title: String(body.title || "Untitled Event").trim(),
        eventType: String(body.eventType || "Wedding Celebration").trim(),
        date: String(body.date || "").trim(),
        venue: String(body.venue || "").trim(),
        mapUrl: String(body.mapUrl || "").trim(),
        packageName: String(body.packageName || "").trim(),
        language: String(body.language || "English").trim(),
        clientName: String(body.clientName || "").trim(),
        clientPhone: String(body.clientPhone || "").trim(),
        coverDirection: String(body.coverDirection || "").trim(),
        musicDirection: String(body.musicDirection || "").trim(),
        hostNames: "Together with their families",
        message: "We would be delighted to celebrate this special occasion with you.",
        theme: ["ivory", "midnight", "sage"].includes(body.theme) ? body.theme : "ivory",
        coverImageUrl: "",
        musicUrl: "",
        rsvpDeadline: "",
        showRsvp: true,
        generationUsage: { covers: 0, music: 0 },
        generatedCovers: [],
        generatedTracks: [],
        status: "draft",
        createdAt: new Date().toISOString()
      };
      db.invitations.unshift(invitation);
      writeDb(db);
      json(res, 201, { invitation, message: "Invitation request received." });
      return;
    }

    const coverGenerationMatch = pathname.match(/^\/api\/admin\/invitations\/([^/]+)\/generate-cover$/);
    if (req.method === "POST" && coverGenerationMatch) {
      if (!isAuthed(req)) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }
      if (!openAiApiKey) throw providerError("Cover generation is not configured. Add OPENAI_API_KEY in Render.", 503);
      const body = await readBody(req);
      const direction = String(body.prompt || "").trim();
      if (direction.length < 10 || direction.length > 1200) {
        throw providerError("Cover direction must be between 10 and 1200 characters.", 400);
      }
      const db = readDb();
      const invitation = db.invitations.find((item) => item.id === decodeURIComponent(coverGenerationMatch[1]));
      if (!invitation) throw providerError("Invitation not found.", 404);
      const usage = getGenerationUsage(invitation);
      if (usage.covers >= maxCoverGenerations) {
        throw providerError(`This invitation has reached its limit of ${maxCoverGenerations} cover generations.`, 429);
      }
      const assetUrl = await generateCover(invitation, direction, body.quality);
      const asset = { url: assetUrl, prompt: direction, createdAt: new Date().toISOString() };
      invitation.generatedCovers.unshift(asset);
      invitation.coverImageUrl = assetUrl;
      usage.covers += 1;
      invitation.updatedAt = asset.createdAt;
      writeDb(db);
      json(res, 201, { invitation, asset, remaining: Math.max(0, maxCoverGenerations - usage.covers) });
      return;
    }

    const musicGenerationMatch = pathname.match(/^\/api\/admin\/invitations\/([^/]+)\/generate-music$/);
    if (req.method === "POST" && musicGenerationMatch) {
      if (!isAuthed(req)) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }
      if (!elevenLabsApiKey) throw providerError("Music generation is not configured. Add ELEVENLABS_API_KEY in Render.", 503);
      const body = await readBody(req);
      const direction = String(body.prompt || "").trim();
      const durationSeconds = Math.min(60, Math.max(15, Number(body.durationSeconds || 30)));
      if (direction.length < 10 || direction.length > 1200) {
        throw providerError("Music direction must be between 10 and 1200 characters.", 400);
      }
      const db = readDb();
      const invitation = db.invitations.find((item) => item.id === decodeURIComponent(musicGenerationMatch[1]));
      if (!invitation) throw providerError("Invitation not found.", 404);
      const usage = getGenerationUsage(invitation);
      if (usage.music >= maxMusicGenerations) {
        throw providerError(`This invitation has reached its limit of ${maxMusicGenerations} soundtrack generations.`, 429);
      }
      const assetUrl = await generateMusic(invitation, direction, durationSeconds);
      const asset = { url: assetUrl, prompt: direction, durationSeconds, createdAt: new Date().toISOString() };
      invitation.generatedTracks.unshift(asset);
      invitation.musicUrl = assetUrl;
      usage.music += 1;
      invitation.updatedAt = asset.createdAt;
      writeDb(db);
      json(res, 201, { invitation, asset, remaining: Math.max(0, maxMusicGenerations - usage.music) });
      return;
    }

    const invitationUpdateMatch = pathname.match(/^\/api\/admin\/invitations\/([^/]+)$/);
    if (req.method === "PUT" && invitationUpdateMatch) {
      if (!isAuthed(req)) {
        json(res, 401, { error: "Unauthorized" });
        return;
      }
      const body = await readBody(req);
      const db = readDb();
      const invitation = db.invitations.find((item) => item.id === decodeURIComponent(invitationUpdateMatch[1]));
      if (!invitation) {
        json(res, 404, { error: "Invitation not found" });
        return;
      }
      const fields = [
        "title", "eventType", "date", "venue", "mapUrl", "packageName", "language",
        "clientName", "clientPhone", "hostNames", "message", "coverImageUrl", "musicUrl", "rsvpDeadline",
        "coverDirection", "musicDirection"
      ];
      fields.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) invitation[field] = String(body[field] || "").trim();
      });
      if (Object.prototype.hasOwnProperty.call(body, "theme")) {
        invitation.theme = ["ivory", "midnight", "sage"].includes(body.theme) ? body.theme : "ivory";
      }
      if (Object.prototype.hasOwnProperty.call(body, "showRsvp")) invitation.showRsvp = Boolean(body.showRsvp);
      if (Object.prototype.hasOwnProperty.call(body, "status")) invitation.status = invitationStatus(body.status);
      invitation.updatedAt = new Date().toISOString();
      if (invitation.status === "published" && !invitation.publishedAt) invitation.publishedAt = invitation.updatedAt;
      writeDb(db);
      json(res, 200, {
        invitation,
        previewUrl: `/invite/${invitation.slug}?preview=1`,
        publicUrl: invitation.status === "published" ? `/invite/${invitation.slug}` : null
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/rsvps") {
      const body = await readBody(req);
      const db = readDb();
      const invite = db.invitations.find((item) => item.id === body.invitationId);
      if (!invite) {
        json(res, 404, { error: "Invitation not found" });
        return;
      }
      const rsvp = {
        id: createId("rsvp"),
        invitationId: invite.id,
        name: String(body.name || "").trim(),
        phone: String(body.phone || "").trim(),
        count: Number(body.count || 0),
        status: body.status === "not-attending" ? "not-attending" : "attending",
        createdAt: new Date().toISOString()
      };
      db.rsvps.unshift(rsvp);
      writeDb(db);
      json(res, 201, { rsvp });
      return;
    }

    if (req.method === "POST" && pathname === "/api/bookings") {
      const body = await readBody(req);
      const db = readDb();
      const booking = {
        id: createId("booking"),
        client: String(body.client || "").trim(),
        eventType: String(body.eventType || "").trim(),
        date: String(body.date || "").trim(),
        packageName: String(body.packageName || "").trim(),
        coverage: Array.isArray(body.coverage) ? body.coverage.map(String) : [],
        createdAt: new Date().toISOString(),
        status: "new"
      };
      db.bookings.unshift(booking);
      writeDb(db);
      json(res, 201, { booking });
      return;
    }

    json(res, 404, { error: "API route not found" });
  } catch (error) {
    json(res, error.status || 400, { error: error.message });
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) {
    handleApi(req, res, pathname);
    return;
  }

  if (req.method === "GET" && pathname === "/admin") {
    send(res, 200, adminPage(), { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/invite/")) {
    const slug = decodeURIComponent(pathname.replace("/invite/", ""));
    const invite = readDb().invitations.find((item) => item.slug === slug);
    if (!invite) {
      send(res, 404, "Invitation not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const isPreview = url.searchParams.get("preview") === "1" && isAuthed(req);
    if (invitationStatus(invite.status) !== "published" && !isPreview) {
      send(res, 404, "This invitation has not been published yet.", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    send(res, 200, invitePage(invite, isPreview), { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return;
  }

  if (req.method === "GET") {
    if (pathname.startsWith("/data/") || pathname.startsWith("/.")) {
      send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    serveFile(req, res);
    return;
  }

  send(res, 405, "Method not allowed", { "Content-Type": "text/plain; charset=utf-8" });
});

ensureDb();
server.listen(port, () => {
  console.log(`Tony event platform running at http://localhost:${port}`);
});

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const dbPath = path.join(root, "data", "db.json");
const port = Number(process.env.PORT || 3000);
const adminPassword = process.env.ADMIN_PASSWORD || "tony-admin";
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
  ".txt": "text/plain; charset=utf-8",
  ".toml": "text/plain; charset=utf-8"
};

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
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

function invitePage(invite) {
  const title = escapeHtml(invite.title);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} | Digital Invitation</title>
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body class="invite-public-body">
    <main class="invite-public-page">
      <section class="invite-public-card">
        <p class="invite-kicker">${escapeHtml(invite.eventType || "Event Invitation")}</p>
        <h1>${title}</h1>
        <p>${escapeHtml(invite.date)}</p>
        <p>${escapeHtml(invite.venue)}</p>
        ${invite.mapUrl ? `<a class="button outline" href="${escapeHtml(invite.mapUrl)}" target="_blank" rel="noopener noreferrer">Open Location</a>` : ""}
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
      </section>
    </main>
    <script src="/invite.js"></script>
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
      json(res, 200, readDb());
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
        status: "live",
        createdAt: new Date().toISOString()
      };
      db.invitations.unshift(invitation);
      writeDb(db);
      json(res, 201, { invitation, url: `/invite/${invitation.slug}` });
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
    json(res, 400, { error: error.message });
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
    send(res, 200, invitePage(invite), { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    return;
  }

  if (req.method === "GET") {
    serveFile(req, res);
    return;
  }

  send(res, 405, "Method not allowed", { "Content-Type": "text/plain; charset=utf-8" });
});

ensureDb();
server.listen(port, () => {
  console.log(`Tony event platform running at http://localhost:${port}`);
});

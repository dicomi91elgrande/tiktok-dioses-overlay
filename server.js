const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3041);
const publicDir = path.join(__dirname, "public");

let eventId = 0;
let events = [];
let log = [];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) reject(new Error("Payload demasiado grande"));
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseBodyData(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const params = new URLSearchParams(body);
    return Object.fromEntries(params.entries());
  }
}

function normalizeViewer(data) {
  const user = data.user && typeof data.user === "object" ? data.user : {};
  const source = { ...user, ...data };
  const name = String(
    source.name
    || source.nickname
    || source.nickName
    || source.username
    || source.userName
    || source.uniqueId
    || source.displayName
    || "Nuevo seguidor"
  ).trim();
  const rawAvatar = String(
    source.avatar
    || source.imgprofile
    || source.imgProfile
    || source.profileImage
    || source.profilePictureUrl
    || source.avatarUrl
    || source.photo
    || ""
  ).trim();
  let avatar = rawAvatar;
  try {
    avatar = decodeURIComponent(rawAvatar);
  } catch {
    avatar = rawAvatar;
  }
  return {
    id: ++eventId,
    name,
    username: String(source.username || source.userName || source.uniqueId || name).trim(),
    avatar,
    updatedAt: Date.now()
  };
}

function registerEvent(viewer, meta = {}) {
  events.unshift(viewer);
  events = events.slice(0, 40);
  log.unshift({
    at: new Date().toISOString(),
    viewer,
    meta
  });
  log = log.slice(0, 80);
  console.log("Asignacion mitologica:", viewer);
  return viewer;
}

function characterNameFromFile(fileName) {
  return path.basename(fileName, path.extname(fileName));
}

function listCharacters() {
  const charactersDir = path.join(publicDir, "character-images");
  const allowed = new Set([".png", ".jpg", ".jpeg", ".webp"]);
  return fs.readdirSync(charactersDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && allowed.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => ({
      name: characterNameFromFile(entry.name),
      image: `character-images/${encodeURIComponent(entry.name)}`
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function proxyImage(imageUrl, res) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
    sendJson(res, 400, { ok: false, error: "URL invalida" });
    return;
  }

  const client = imageUrl.startsWith("https:") ? require("https") : require("http");
  const request = client.get(imageUrl, {
    headers: { "User-Agent": "TikTokDiosesOverlay/1.0" }
  }, (imageRes) => {
    if (imageRes.statusCode >= 300 && imageRes.statusCode < 400 && imageRes.headers.location) {
      proxyImage(imageRes.headers.location, res);
      return;
    }
    if (imageRes.statusCode !== 200) {
      sendJson(res, 502, { ok: false, error: "No se pudo cargar imagen" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": imageRes.headers["content-type"] || "image/jpeg",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600"
    });
    imageRes.pipe(res);
  });
  request.on("error", () => {
    if (!res.headersSent) sendJson(res, 502, { ok: false, error: "Error cargando imagen" });
  });
  request.setTimeout(8000, () => request.destroy());
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(publicDir, requested));
  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { ok: false, error: "Forbidden" });
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=3600"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/api/events") {
    sendJson(res, 200, events);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/log") {
    sendJson(res, 200, log);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/avatar") {
    proxyImage(url.searchParams.get("url") || "", res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/characters") {
    try {
      sendJson(res, 200, listCharacters());
    } catch (error) {
      sendJson(res, 500, { ok: false, error: "No se pudo leer la lista de personajes" });
    }
    return;
  }

  const webhookPaths = new Set(["/follow", "/api/follow", "/likes", "/api/likes", "/assign", "/api/assign", "/webhook", "/api/webhook"]);
  if ((req.method === "GET" || req.method === "POST") && webhookPaths.has(url.pathname)) {
    try {
      const body = req.method === "POST" ? await readBody(req) : "";
      const data = {
        ...parseBodyData(body),
        ...Object.fromEntries(url.searchParams.entries())
      };
      const viewer = normalizeViewer(data);
      const event = registerEvent(viewer, {
        method: req.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        parsed: data
      });
      sendJson(res, 200, { ok: true, event });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Overlay listo: http://localhost:${PORT}`);
  console.log(`Webhook Interactive: http://localhost:${PORT}/follow?name={nickname}&avatar={imgprofile}`);
});

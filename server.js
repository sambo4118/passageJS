const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT) || 3000;
const rootDir = process.cwd();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".psg": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8"
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || "application/octet-stream";
}

function toSafePath(urlPath) {
  const normalized = path.normalize(urlPath).replace(/^([.][.][/\\])+/, "");
  return path.resolve(rootDir, `.${path.sep}${normalized}`);
}

async function handleRequest(req, res) {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const absolutePath = toSafePath(decodeURIComponent(requestedPath));

    if (!absolutePath.startsWith(rootDir + path.sep)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    const fileContent = await fs.readFile(absolutePath);
    res.writeHead(200, { "Content-Type": getContentType(absolutePath) });
    res.end(fileContent);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
}

const server = http.createServer((req, res) => {
  void handleRequest(req, res);
});

server.listen(port, host, () => {
  console.log(`Dev server running at http://${host}:${port}`);
});

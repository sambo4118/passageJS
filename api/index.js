import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { ok } from "node:assert";
import { hostname } from "node:os";
import { compile } from "../src/parsing/compile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const passagesDir = path.resolve(__dirname, "../passages");

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
app.get("api/health", async () => {
    return { ok: true };
});

app.get("/api/passages/:slug", async (request, reply) => {
    const { slug } = request.params;

    if (!slug || slug.includes("..") || slug.startsWith("/") || slug.startsWith("\\")) {
        return reply.status(400).send({ error: "Invalid slug" });
    }
    const filePath = path.join(passagesDir, `${slug}.psg`);
    const rel = path.relative(passagesDir, filePath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        return reply.status(400).send({ error: "Invalid slug" });
    }

    try {
        const text = await readFile(filePath, "utf-8");

        return compile(text);

    } catch (err) {
        if (err && err.code === "ENOENT") {
            return reply.status(404).send({ error: "Passage not found" });
        }
        app.log.error(err);
        return reply.status(500).send({ error: "Internal server error" });
    }
});

const port = Number(process.env.PORT || 3000);
await app.listen({ port, host: "0.0.0.0" });
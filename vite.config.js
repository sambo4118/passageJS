import { defineConfig } from 'vite'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from './src/parser.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PASSAGES_DIR = path.resolve(__dirname, 'passages')

export default defineConfig({
  plugins: [
    {
      name: 'passage-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          // Match /passage/<name>.psg
          const match = req.url && req.url.match(/^\/passage\/([^/?#]+)\.psg(?:\?.*)?$/)
          if (!match) return next()

          const name = decodeURIComponent(match[1])

          // Block path traversal: only allow simple file names
          if (name.includes('/') || name.includes('\\') || name.includes('..')) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid passage name' }))
            return
          }

          const filePath = path.join(PASSAGES_DIR, `${name}.psg`)

          // Defense in depth: ensure resolved path is still inside PASSAGES_DIR
          if (!filePath.startsWith(PASSAGES_DIR + path.sep)) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid passage name' }))
            return
          }

          try {
            const text = await readFile(filePath, 'utf8')
            const parsed = parse(text)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ name, parsed }))
          } catch (err) {
            if (err.code === 'ENOENT') {
              res.statusCode = 404
              res.end(JSON.stringify({ error: `Passage not found: ${name}` }))
            } else {
              res.statusCode = 500
              res.end(JSON.stringify({ error: err.message }))
            }
          }
        })
      },
    },
  ],
})
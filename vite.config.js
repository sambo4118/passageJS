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
          if (!req.url) return next()

          // Match /passage/<name>.psg, including nested paths like menu/title-screen.
          const match = req.url.match(/^\/passages\/([^?#]+\.psg)(?:\?.*)?$/)
          if (!match) return next()

          const encodedPath = match[1]
          const name = decodeURIComponent(encodedPath.replace(/\.psg$/, ''))

          // Block obvious traversal attempts before resolving full path.
          if (name.includes('..') || name.startsWith('/') || name.startsWith('\\')) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'Invalid passage name' }))
            return
          }

          const filePath = path.resolve(PASSAGES_DIR, `${name}.psg`)

          // Defense in depth: ensure resolved path is still inside PASSAGES_DIR.
          if (path.relative(PASSAGES_DIR, filePath).startsWith('..') || path.isAbsolute(path.relative(PASSAGES_DIR, filePath))) {
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
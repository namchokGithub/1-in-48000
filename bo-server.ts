import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { v2AssetListSchema, v2ContentSchema } from './src/content/v2/schema.ts'

type EditableFile =
  | 'config'
  | 'events'
  | 'endings'
  | 'characters'
  | 'assets'
  | 'faculties'
  | 'majors'
  | 'electives'
  | 'names'
  | 'flow'
type ValidationIssue = { path: string; message: string }
const MAX_BODY_BYTES = 2 * 1024 * 1024
const files = [
  'config',
  'events',
  'characters',
  'assets',
  'endings',
  'names',
  'faculties',
  'majors',
  'electives',
  'flow',
] as const

export class BoValidationError extends Error {
  readonly issues: ValidationIssue[]

  constructor(issues: ValidationIssue[]) {
    super('Content validation failed')
    this.issues = issues
  }
}

export type BoFileChanges = Partial<Record<EditableFile, unknown>>

export function isEditableFile(name: string): name is EditableFile {
  return (files as readonly string[]).includes(name)
}

/**
 * Saves several content files as one change. The files are checked together
 * with the rest of the content on disk, so edits that depend on each other
 * (a new choice in events and its edge in flow) pass together. Nothing is
 * written unless the whole set is valid.
 */
export async function saveBoFiles(
  root: string,
  changes: BoFileChanges,
): Promise<void> {
  const changed = Object.keys(changes).filter(isEditableFile)
  if (!changed.length) return
  const contentDir = join(root, 'public', 'content-v2')
  const entries = await Promise.all(
    files.map(async (name) => {
      if (name in changes) return [name, changes[name]] as const
      const text = await readFile(join(contentDir, `${name}.json`), 'utf8')
      return [name, JSON.parse(text) as unknown] as const
    }),
  )
  const content = Object.fromEntries(entries)
  const parsed = v2ContentSchema.safeParse(content)
  const issues: ValidationIssue[] = parsed.success
    ? []
    : parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
  const manifest = v2AssetListSchema.safeParse(content.assets)
  if (manifest.success) {
    for (const [index, asset] of manifest.data.entries()) {
      if (!existsSync(join(root, 'public', asset.path.slice(1)))) {
        issues.push({
          path: `assets.${index}.path`,
          message: `ไม่พบไฟล์ Asset: ${asset.path}`,
        })
      }
    }
  }
  if (issues.length) throw new BoValidationError(issues)

  // Write every file to a temporary name first, then swap them in, so a
  // failed write leaves the content files untouched.
  const written: { temporary: string; target: string }[] = []
  try {
    for (const file of changed) {
      const target = join(contentDir, `${file}.json`)
      const temporary = `${target}.${randomUUID()}.tmp`
      await writeFile(
        temporary,
        `${JSON.stringify(changes[file], null, 2)}\n`,
        { flag: 'wx' },
      )
      written.push({ temporary, target })
    }
    for (const { temporary, target } of written) await rename(temporary, target)
  } catch (error) {
    await Promise.all(
      written.map(({ temporary }) => unlink(temporary).catch(() => undefined)),
    )
    throw error
  }
}

export async function saveBoContent(
  root: string,
  file: EditableFile,
  value: unknown,
): Promise<void> {
  await saveBoFiles(root, { [file]: value })
}

function respond(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > MAX_BODY_BYTES) throw new Error('Request body is too large')
    chunks.push(bytes)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

export function boContentPlugin(): Plugin {
  return {
    name: 'local-bo-content-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path === '/content-manage' || path === '/content-manage/') {
          if (req.method !== 'GET') {
            respond(res, 405, { error: 'Method not allowed' })
            return
          }
          if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? '')) {
            respond(res, 403, { error: 'Local BO request required' })
            return
          }
          try {
            const html = await server.transformIndexHtml(
              '/content-manage',
              `<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300&display=swap" rel="stylesheet" />
    <link rel="icon" type="image/x-icon" href="/images/Kawaii-tropical-study.ico" />
    <title>BO · 1 ใน 48,000</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/bo.tsx"></script>
  </body>
</html>`,
            )
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(html)
          } catch {
            respond(res, 500, { error: 'Could not open BO' })
          }
          return
        }
        const match = path?.match(
          /^\/__bo\/v2\/content(?:\/(config|events|endings|characters|assets|faculties|majors|electives|names|flow))?$/,
        )
        if (!match) {
          next()
          return
        }
        const file = match[1] as EditableFile | undefined
        if (req.method !== 'PUT') {
          respond(res, 405, { error: 'Method not allowed' })
          return
        }
        const host = req.headers.host ?? ''
        if (
          !/^127\.0\.0\.1:\d+$/.test(host) ||
          req.headers.origin !== `http://${host}` ||
          !req.headers['content-type']?.startsWith('application/json')
        ) {
          respond(res, 403, { error: 'Local BO request required' })
          return
        }
        try {
          const value = await readBody(req)
          if (file) await saveBoContent(server.config.root, file, value)
          else {
            const changes = (value as { files?: unknown } | null)?.files
            if (
              !changes ||
              typeof changes !== 'object' ||
              Array.isArray(changes) ||
              !Object.keys(changes).length ||
              !Object.keys(changes).every(isEditableFile)
            ) {
              respond(res, 400, { error: 'Invalid content files' })
              return
            }
            await saveBoFiles(server.config.root, changes as BoFileChanges)
          }
          respond(res, 200, { ok: true })
        } catch (error) {
          if (error instanceof BoValidationError) {
            respond(res, 400, { issues: error.issues })
          } else if (error instanceof SyntaxError) {
            respond(res, 400, { error: 'Invalid JSON' })
          } else if (
            error instanceof Error &&
            error.message === 'Request body is too large'
          ) {
            respond(res, 413, { error: error.message })
          } else {
            respond(res, 500, { error: 'Could not write content file' })
          }
        }
      })
    },
  }
}

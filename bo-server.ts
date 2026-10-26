import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { assetListSchema } from './src/content/schema.ts'
import {
  validateContent,
  type ValidationIssue,
} from './src/content/validate.ts'

type EditableFile = 'events' | 'endings'
const files = ['config', 'events', 'characters', 'assets', 'endings'] as const
const MAX_BODY_BYTES = 2 * 1024 * 1024

export class BoValidationError extends Error {
  readonly issues: ValidationIssue[]

  constructor(issues: ValidationIssue[]) {
    super('Content validation failed')
    this.issues = issues
  }
}

export async function saveBoContent(
  root: string,
  file: EditableFile,
  value: unknown,
): Promise<void> {
  const contentDir = join(root, 'public', 'content')
  const entries = await Promise.all(
    files.map(async (name) => {
      const text = await readFile(join(contentDir, `${name}.json`), 'utf8')
      return [name, JSON.parse(text) as unknown] as const
    }),
  )
  const content = Object.fromEntries(entries)
  content[file] = value
  const issues = validateContent(content)
  const manifest = assetListSchema.safeParse(content.assets)
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

  const target = join(contentDir, `${file}.json`)
  const temporary = `${target}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      flag: 'wx',
    })
    await rename(temporary, target)
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    throw error
  }
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
        if (
          path !== '/__bo/content/events' &&
          path !== '/__bo/content/endings'
        ) {
          next()
          return
        }
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
          const file = path.endsWith('/events') ? 'events' : 'endings'
          await saveBoContent(server.config.root, file, value)
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

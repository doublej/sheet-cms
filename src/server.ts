import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { Elysia } from 'elysia'
import { loadConfig } from './config/loader.js'
import { env } from './env.js'
import { logger } from './logger.js'
import { syncRoutes } from './routes/sync.js'

export async function startServer(configPath?: string) {
  const config = await loadConfig(configPath)

  const app = new Elysia()
    .use(cors())
    .use(swagger())
    .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
    .use(syncRoutes(config))
    .listen({ port: env.PORT, hostname: env.HOST })

  logger.info(`Server running at http://${env.HOST}:${env.PORT}`)

  return app
}

// Auto-start when run directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.main) {
  startServer()
}

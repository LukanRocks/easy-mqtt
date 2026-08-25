import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { app, configureApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const pool = configureApp(config)

// In production the built SPA is served from WEB_DIR with a client-side-routing
// fallback to index.html. In dev this is unset and Vite serves the SPA.
if (config.webDir) {
  const indexHtml = readFileSync(join(config.webDir, 'index.html'), 'utf8')
  app.use('*', serveStatic({ root: config.webDir }))
  app.get('*', (c) => {
    // Unknown API paths get a proper JSON 404 rather than falling through to
    // the SPA; everything else serves index.html for client-side routing.
    if (c.req.path.startsWith('/api/')) return c.json({ error: 'not found' }, 404)
    return c.html(indexHtml)
  })
}

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`easy-mqtt admin listening on http://0.0.0.0:${info.port}`)
  console.log(`  broker: mqtt://${config.mqttHost}:${config.mqttPort}`)
})

function shutdown(signal: string) {
  console.log(`received ${signal}, shutting down`)
  pool.dispose()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 3000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

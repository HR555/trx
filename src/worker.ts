// @ts-ignore: .open-next/worker.js is generated at build time
import { default as handler } from '../.open-next/worker.js'

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    // Forward all standard HTTP requests to the Next.js/Payload handler
    return handler.fetch(request, env, ctx)
  },

  async scheduled(event: any, env: any, ctx: ExecutionContext) {
    console.log('Cron trigger executed:', event.cron)

    const callSync = async (path: string) => {
      // Use the internal handler to trigger the API route without an external HTTP hop
      const url = `http://localhost/api${path}`
      console.log(`Triggering ${url}...`)
      try {
        const res = await handler.fetch(new Request(url), env, ctx)
        const text = await res.text()
        console.log(`${path} response (${res.status}):`, text)
      } catch (err) {
        console.error(`Error triggering ${path}:`, err)
      }
    }

    switch (event.cron) {
      case '* * * * *': // Every hour
        console.log('Running Hourly Sync (Products)...')
        // await callSync('/sync/categories')
        await callSync('/sync/products')
        break

      // case '* * * * *': // Every minute
      //   console.log('Running Minute Sync (Inventory)...')
      //   await callSync('/sync/inventory')
      //   break

      default:
        console.log('Unknown cron trigger:', event.cron)
    }
  },
}

// Re-export everything else from the original worker (Durable Objects, etc.)
// @ts-ignore
export * from '../.open-next/worker.js'

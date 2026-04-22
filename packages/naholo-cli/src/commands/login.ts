import confirm from '@inquirer/confirm'
import input from '@inquirer/input'
import select from '@inquirer/select'
import { Command } from 'commander'
import crypto from 'node:crypto'
import http from 'node:http'
import os from 'node:os'
import { writeGlobalClaudeConfig } from '../claude-code-config.js'
import { CliError, withErrorHandling } from '../errors.js'
import { ensureNaholoHomeDir, setDefaultProfile } from '../global-config.js'
import { listProfiles, readProfile, writeProfile } from '../profile.js'

export const loginCommand = new Command('login')
  .description('Authenticate with a Naholo server')
  .option('--base-url <url>', 'server URL')
  .action(
    withErrorHandling(async (options: { baseUrl?: string }) => {
      // 1. Get base URL
      let baseUrl = options.baseUrl
      if (!baseUrl) {
        baseUrl = 'https://naholo.app'
        // baseUrl = 'http://localhost:3000'
      }
      baseUrl = baseUrl.replace(/\/$/, '')

      // 2. Select existing profile or create new one
      const existingProfileNames = listProfiles()

      if (existingProfileNames.length > 0) {
        const choices: { name: string; value: string | null }[] =
          existingProfileNames.map((name) => {
            const profile = readProfile(name)
            const detail = profile != null ? ` (${profile.baseUrl})` : ''
            return { name: `${name}${detail}`, value: name }
          })
        choices.push({ name: 'Create new profile', value: null })

        const selected = await select({
          message: 'Select a profile or create a new one',
          choices,
        })

        if (selected != null) {
          setDefaultProfile(selected)
          console.log(`Switched to profile "${selected}".`)
          return
        }
      }

      // 3. Prompt for new profile name
      let defaultProfileName: string
      const existingSet = new Set(existingProfileNames)
      do {
        defaultProfileName = `profile-${crypto.randomBytes(4).toString('hex')}`
      } while (existingSet.has(defaultProfileName))

      const profileName = await input({
        message: 'Profile name',
        default: defaultProfileName,
      })

      if (existingSet.has(profileName)) {
        const overwrite = await confirm({
          message: `Profile "${profileName}" already exists. Overwrite?`,
          default: false,
        })
        if (!overwrite) {
          console.log('Aborted.')
          return
        }
      }

      // 4. Prompt for token name (name shown in the web app)
      const defaultTokenName = `${os.userInfo().username}@${os.hostname()}`
      const tokenName = await input({
        message: 'Token name in naholo server',
        default: defaultTokenName,
      })

      // 5. Generate state
      const state = crypto.randomBytes(32).toString('hex')

      // 6. Start local server to receive callback
      const callbackServer = await startCallbackServer(baseUrl)

      try {
        // 7. Create CLI login request
        const callbackUrl = `http://localhost:${callbackServer.port}/callback`
        const createRes = await fetch(`${baseUrl}/api/auth/cli/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state, callbackUrl }),
        })

        if (!createRes.ok) {
          const text = await createRes.text()
          throw new CliError(`Failed to create login request: ${text}`)
        }

        const { requestId, words } = (await createRes.json()) as {
          requestId: string
          words: string
        }

        // 8. Display verification words and open browser
        console.log()
        console.log('Verification words:')
        console.log()
        console.log(`  ${words}`)
        console.log()
        console.log('Verify these words match what you see in the browser.')
        console.log()

        await input({ message: 'Press Enter to open browser...' })

        // 9. Open browser
        const open = (await import('open')).default
        const child = await open(`${baseUrl}/auth/cli/confirm/${requestId}`)
        child.unref()

        console.log('Waiting for approval in browser...')

        // 8. Wait for callback code
        const code = await callbackServer.waitForCode()

        if (code == null) {
          throw new CliError('Login timed out or was cancelled.')
        }

        // 9. Exchange code for token
        const exchangeRes = await fetch(`${baseUrl}/api/auth/cli/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state, requestId, code, tokenName }),
        })

        if (!exchangeRes.ok) {
          const text = await exchangeRes.text()
          throw new CliError(`Failed to exchange code: ${text}`)
        }

        const { token, tokenHint } = (await exchangeRes.json()) as {
          token: string
          tokenHint: string
          tokenName: string
        }

        // 10. Save profile
        ensureNaholoHomeDir()
        writeProfile(profileName, {
          baseUrl,
          token,
          tokenName,
          createdAt: new Date().toISOString(),
        })
        setDefaultProfile(profileName)

        // Register MCP server and permissions globally
        writeGlobalClaudeConfig()

        console.log()
        console.log(`Logged in successfully.`)
        console.log(`  Profile: ${profileName}`)
        console.log(`  Token:   ${tokenHint}`)
      } finally {
        callbackServer.close()
      }
    }),
  )

interface CallbackServer {
  port: number
  waitForCode: () => Promise<string | null>
  close: () => void
}

function startCallbackServer(baseUrl: string): Promise<CallbackServer> {
  return new Promise((resolve, reject) => {
    let codeResolve: (code: string | null) => void
    const codePromise = new Promise<string | null>((res) => {
      codeResolve = res
    })

    const completeUrl = `${baseUrl}/auth/cli/complete`

    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost`)
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code')
        if (code) {
          res.writeHead(302, { Location: completeUrl })
          res.end()
          codeResolve(code)
        } else {
          const error = url.searchParams.get('error') ?? 'No code received'
          res.writeHead(302, {
            Location: `${completeUrl}?error=${encodeURIComponent(error)}`,
          })
          res.end()
          codeResolve(null)
        }
      } else {
        res.writeHead(404)
        res.end()
      }
    })

    const timeout = setTimeout(
      () => {
        codeResolve(null)
        server.closeAllConnections()
        server.close()
      },
      5 * 60 * 1000,
    )

    server.listen(0, () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to start callback server'))
        return
      }
      resolve({
        port: addr.port,
        waitForCode: () => codePromise,
        close: () => {
          clearTimeout(timeout)
          server.closeAllConnections()
          server.close()
        },
      })
    })

    server.on('error', reject)
  })
}

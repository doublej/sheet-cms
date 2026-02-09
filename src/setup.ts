import { existsSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'

const INSTRUCTIONS = `
  Google Cloud Setup
  ──────────────────
  1. Go to https://console.cloud.google.com
  2. Create a new project (or select an existing one)
  3. Enable the Google Sheets API:
     APIs & Services → Library → search "Google Sheets API" → Enable
  4. Create a service account:
     APIs & Services → Credentials → Create Credentials → Service Account
  5. Create a JSON key for the service account:
     Click the service account → Keys → Add Key → Create new key → JSON
  6. Save the downloaded JSON file in your project directory
`

export async function setup() {
  console.log(INSTRUCTIONS)

  const rl = createInterface({ input: process.stdin, output: process.stdout })

  try {
    const credentialsPath = await promptCredentialsPath(rl)
    const email = await promptEmail(rl)
    const spreadsheetId = await promptSpreadsheetId(rl)

    writeEnvFile(credentialsPath, spreadsheetId)

    console.log(`
  .env written successfully!

  Next step: share your Google Sheet with the service account:
    → Open your spreadsheet
    → Click "Share"
    → Add: ${email}
    → Give "Editor" access
`)
  } finally {
    rl.close()
  }
}

async function promptCredentialsPath(rl: ReturnType<typeof createInterface>) {
  while (true) {
    const answer = await rl.question('  Path to credentials JSON file: ')
    const trimmed = answer.trim()
    if (!trimmed) continue
    if (!existsSync(trimmed)) {
      console.log(`  File not found: ${trimmed}\n`)
      continue
    }
    return trimmed
  }
}

async function promptEmail(rl: ReturnType<typeof createInterface>) {
  while (true) {
    const answer = await rl.question('  Service account email: ')
    const trimmed = answer.trim()
    if (trimmed) return trimmed
  }
}

async function promptSpreadsheetId(rl: ReturnType<typeof createInterface>) {
  while (true) {
    const answer = await rl.question('  Google Spreadsheet ID: ')
    const trimmed = answer.trim()
    if (trimmed) return trimmed
  }
}

function writeEnvFile(credentialsPath: string, spreadsheetId: string) {
  const content = [
    `GOOGLE_CREDENTIALS_PATH=${credentialsPath}`,
    `SHEET_CMS_SPREADSHEET_ID=${spreadsheetId}`,
    '',
  ].join('\n')

  writeFileSync('.env', content)
}

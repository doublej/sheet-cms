import { defineConfig } from './src/config/schema.js'

export default defineConfig({
  spreadsheetId: process.env.GOOGLE_SHEETS_ID || 'test-spreadsheet-id',
  credentialsPath: './google-credentials.json',
  dataDir: 'public/data',
  files: {
    global: { type: 'keyvalue' },
    collections: { type: 'array', arrayPath: 'content.collections' },
  },
  blacklist: {
    '*': ['metaData', '**.id'],
    collections: ['content.collections[*].image'],
  },
  validation: [
    {
      match: '**.href',
      message: 'must be https:// or local path',
      rule: { pattern: '^(https://|/)' },
    },
  ],
})

import { google } from 'googleapis'
import type { SheetData } from '../types.js'

type SheetsClientConfig = {
  spreadsheetId: string
  credentialsPath: string
}

export type SheetsClient = {
  read: (sheetName: string) => Promise<SheetData>
  write: (sheetName: string, values: SheetData) => Promise<void>
  exists: (sheetName: string) => Promise<boolean>
  create: (sheetName: string) => Promise<void>
}

export function createSheetsClient(config: SheetsClientConfig): SheetsClient {
  const { spreadsheetId, credentialsPath } = config

  function getSheets() {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    return google.sheets({ version: 'v4', auth })
  }

  return {
    async read(sheetName) {
      const sheets = getSheets()
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:ZZ`,
      })
      return (response.data.values as SheetData) || []
    },

    async write(sheetName, values) {
      const sheets = getSheets()
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:ZZ`,
      })
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values },
      })
    },

    async exists(sheetName) {
      const sheets = getSheets()
      const response = await sheets.spreadsheets.get({ spreadsheetId })
      const names = response.data.sheets?.map((s) => s.properties?.title) || []
      return names.includes(sheetName)
    },

    async create(sheetName) {
      const sheets = getSheets()
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        },
      })
    },
  }
}

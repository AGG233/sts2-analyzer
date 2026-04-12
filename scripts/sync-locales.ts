// Sync game translations from Slay the Spire 2 source code.
// Usage: npx tsx scripts/sync-locales.ts [game-src-dir]
// Default game-src-dir: ~/src/Slay the Spire 2

import * as fs from 'fs'
import * as path from 'path'

const GAME_SRC = process.argv[2] || path.join(process.env.HOME!, 'src/Slay the Spire 2')
const LOCALE_DIR = path.join(import.meta.dirname ?? '.', '..', 'src', 'locales', 'game')

// Language mapping: game dir name → our locale code
const LANG_MAP: Record<string, string> = {
  eng: 'en',    // English
  zhs: 'zh',    // Simplified Chinese
  jpn: 'ja',    // Japanese
  kor: 'ko',    // Korean
  deu: 'de',    // German
  fra: 'fr',    // French
  esp: 'es',    // Spanish (Spain)
  spa: 'es',    // Spanish (Latin America)
  ita: 'it',    // Italian
  pol: 'pl',    // Polish
  ptb: 'pt',    // Portuguese (Brazil)
  rus: 'ru',    // Russian
  tur: 'tr',    // Turkish
  tha: 'th',    // Thai
}

// Files to extract, and which keys to keep
const EXTRACT_FILES = [
  'characters',
  'cards',
  'relics',
  'encounters',
  'monsters',
  'acts',
  'potions',
  'map',
  'gameplay_ui',
  'run_history',
  'events',
  'ancients',
  'enchantments',
  'game_modes',
  'modifiers',
  'rest_site_ui',
  'game_over_screen',
]

// Key suffixes to keep (titles, names, descriptions)
const KEEP_SUFFIXES = ['.title', '.name', '.description']

function extractKeys(data: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(data)) {
    if (KEEP_SUFFIXES.some(s => key.endsWith(s))) {
      result[key] = value
    }
  }
  return result
}

// Convert flat keys like "STRIKE_NECROBINDER.title" into nested objects
// { "STRIKE_NECROBINDER.title": "打击" } → { "STRIKE_NECROBINDER": { "title": "打击" } }
// This is required because vue-i18n treats dots as path separators.
function unflatten(obj: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.')
    let current: Record<string, unknown> = result
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {}
      }
      current = current[parts[i]] as Record<string, unknown>
    }
    current[parts[parts.length - 1]] = value
  }
  return result
}

function main() {
  console.log(`Game source: ${GAME_SRC}`)
  console.log(`Output dir:  ${LOCALE_DIR}`)

  fs.mkdirSync(LOCALE_DIR, { recursive: true })

  for (const [gameLang, localeCode] of Object.entries(LANG_MAP)) {
    const gameLocaleDir = path.join(GAME_SRC, 'localization', gameLang)
    if (!fs.existsSync(gameLocaleDir)) {
      console.warn(`SKIP: ${gameLocaleDir} not found`)
      continue
    }

    const nested: Record<string, unknown> = {}

    for (const file of EXTRACT_FILES) {
      const filePath = path.join(gameLocaleDir, `${file}.json`)
      if (!fs.existsSync(filePath)) {
        console.warn(`  SKIP: ${file}.json not found`)
        continue
      }

      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      nested[file] = unflatten(extractKeys(raw))
    }

    const outputPath = path.join(LOCALE_DIR, `${localeCode}.json`)
    fs.writeFileSync(outputPath, JSON.stringify(nested, null, 2) + '\n')
    const keyCount = Object.values(nested).reduce((sum: number, obj) => sum + Object.keys(obj as object).length, 0)
    console.log(`✓ ${localeCode}: ${keyCount} categories → ${outputPath}`)
  }
}

main()

const fs = require('node:fs')
const path = require('node:path')

const rootDir = path.resolve(__dirname, '..')

// UI translations (only en, zh, ja, ko have custom UI text)
const uiEn = require(path.join(rootDir, 'app/locales/ui/en.json'))
const uiZh = require(path.join(rootDir, 'app/locales/ui/zh.json'))
const uiJa = require(path.join(rootDir, 'app/locales/ui/ja.json'))
const uiKo = require(path.join(rootDir, 'app/locales/ui/ko.json'))

// Game translations (all 13 languages)
const gameDe = require(path.join(rootDir, 'app/locales/game/de.json'))
const gameEn = require(path.join(rootDir, 'app/locales/game/en.json'))
const gameEs = require(path.join(rootDir, 'app/locales/game/es.json'))
const gameFr = require(path.join(rootDir, 'app/locales/game/fr.json'))
const gameIt = require(path.join(rootDir, 'app/locales/game/it.json'))
const gameJa = require(path.join(rootDir, 'app/locales/game/ja.json'))
const gameKo = require(path.join(rootDir, 'app/locales/game/ko.json'))
const gamePl = require(path.join(rootDir, 'app/locales/game/pl.json'))
const gamePt = require(path.join(rootDir, 'app/locales/game/pt.json'))
const gameRu = require(path.join(rootDir, 'app/locales/game/ru.json'))
const gameTh = require(path.join(rootDir, 'app/locales/game/th.json'))
const gameTr = require(path.join(rootDir, 'app/locales/game/tr.json'))
const gameZh = require(path.join(rootDir, 'app/locales/game/zh.json'))

const makeMessages = (ui, game) => ({
  ...ui,
  ui,
  game
})

const messages = {
  en: makeMessages(uiEn, gameEn),
  zh: makeMessages(uiZh, gameZh),
  ja: makeMessages(uiJa, gameJa),
  ko: makeMessages(uiKo, gameKo),
  de: makeMessages(uiEn, gameDe),
  fr: makeMessages(uiEn, gameFr),
  es: makeMessages(uiEn, gameEs),
  it: makeMessages(uiEn, gameIt),
  pl: makeMessages(uiEn, gamePl),
  pt: makeMessages(uiEn, gamePt),
  ru: makeMessages(uiEn, gameRu),
  tr: makeMessages(uiEn, gameTr),
  th: makeMessages(uiEn, gameTh)
}

const outputDir = path.join(rootDir, 'app/locales')
for (const [lang, data] of Object.entries(messages)) {
  const outputPath = path.join(outputDir, `${lang}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`Generated: ${lang} -> ${outputPath}`)
}

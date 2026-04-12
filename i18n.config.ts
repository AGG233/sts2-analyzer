import gameDe from '~/locales/game/de.json'
import gameEn from '~/locales/game/en.json'
import gameEs from '~/locales/game/es.json'
import gameFr from '~/locales/game/fr.json'
import gameIt from '~/locales/game/it.json'
import gameJa from '~/locales/game/ja.json'
import gameKo from '~/locales/game/ko.json'
import gamePl from '~/locales/game/pl.json'
import gamePt from '~/locales/game/pt.json'
import gameRu from '~/locales/game/ru.json'
import gameTh from '~/locales/game/th.json'
import gameTr from '~/locales/game/tr.json'
import gameZh from '~/locales/game/zh.json'
import uiEn from '~/locales/ui/en.json'
import uiJa from '~/locales/ui/ja.json'
import uiKo from '~/locales/ui/ko.json'
import uiZh from '~/locales/ui/zh.json'

const en = { ui: uiEn, game: gameEn }
const zh = { ui: uiZh, game: gameZh }
const ja = { ui: uiJa, game: gameJa }
const ko = { ui: uiKo, game: gameKo }
const de = { ui: uiEn, game: gameDe }
const fr = { ui: uiEn, game: gameFr }
const es = { ui: uiEn, game: gameEs }
const it = { ui: uiEn, game: gameIt }
const pl = { ui: uiEn, game: gamePl }
const pt = { ui: uiEn, game: gamePt }
const ru = { ui: uiEn, game: gameRu }
const tr = { ui: uiEn, game: gameTr }
const th = { ui: uiEn, game: gameTh }

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en, zh, ja, ko, de, fr, es, it, pl, pt, ru, tr, th
  }
}))

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  messages: {
    en: { ui: { home: { title: 'STS2 Analyzer', subtitle: 'Analyze your Slay the Spire 2 runs', placeholder: 'Page under construction...' } } },
    zh: { ui: { home: { title: 'STS2 分析器', subtitle: '分析您的杀戮尖塔 2 跑图记录', placeholder: '页面建设中...' } } },
    ja: { ui: { home: { title: 'STS2 アナライザー', subtitle: '杀戮の尖塔2のラン履歴を分析', placeholder: 'ページ構築中...' } } },
    ko: { ui: { home: { title: 'STS2 분석기', subtitle: '杀戮尖塔2 런 기록 분석', placeholder: '페이지 구축 중...' } } }
  }
}))
// Character theme color mapping

export const characterColors: Record<string, string> = {
  'CHARACTER.IRONCLAD': '#ef5350', // 战士 - 红
  'CHARACTER.SILENT': '#66bb6a', // 猎手 - 绿
  'CHARACTER.REGENT': '#ffa726', // 储君 - 黄
  'CHARACTER.NECROBINDER': '#ab47bc', // 亡灵法师 - 紫
  'CHARACTER.DEFECT': '#42a5f5', // 故障机器人 - 蓝
}

export function getCharacterColor(characterId: string): string {
  return characterColors[characterId] ?? '#8aa0b8'
}

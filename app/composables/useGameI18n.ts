export function useGameI18n() {
  const { t } = useI18n()

  /** Maps game IDs like CHARACTER.IRONCLAD to i18n keys. */
  function getGameKey(id: string, type?: string): string {
    if (!id) return ''
    const parts = id.split('.')
    if (parts.length < 2) return id
    return `game.${parts[0].toLowerCase()}s.${parts[1]}.${type || (parts[0] === 'MONSTER' ? 'name' : 'title')}`
  }

  function characterName(id: string): string {
    return t(getGameKey(id))
  }

  function cardName(id: string): string {
    return t(getGameKey(id))
  }

  function relicName(id: string): string {
    return t(getGameKey(id))
  }

  function potionName(id: string): string {
    return t(getGameKey(id))
  }

  function encounterName(id: string): string {
    return t(getGameKey(id))
  }

  function monsterName(id: string): string {
    return t(getGameKey(id))
  }

  function actName(id: string): string {
    return t(getGameKey(id))
  }

  function restSiteChoiceName(id: string): string {
    return t(getGameKey(id, 'title'))
  }

  function eventName(id: string): string {
    return t(getGameKey(id))
  }

  function enchantmentName(id: string): string {
    return t(getGameKey(id))
  }

  function gameModeName(id: string): string {
    return t(getGameKey(id))
  }

  function mapTypeName(type: string): string {
    return t(`game.map_types.${type}`)
  }

  function modelIdName(id: string): string {
    return t(getGameKey(id))
  }

  return {
    characterName,
    cardName,
    relicName,
    potionName,
    encounterName,
    monsterName,
    actName,
    restSiteChoiceName,
    eventName,
    enchantmentName,
    gameModeName,
    mapTypeName,
    modelIdName,
  }
}

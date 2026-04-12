import type { RunFile } from '../types'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getAscensionStats,
  getCardPickRate,
  getDeathCauseStats,
  getDeckEvolution,
  getEncounterStats,
  getFloorTypeDistribution,
  getGoldTimeline,
  getHpTimeline,
  getRelicPickRate,
  getRunSummary,
  getWinRateByCharacter,
} from '../analytics'
import { ParseError, parseProgressFile, parseRunFile } from '../parser'

// ---- Test fixtures ----

const SAVE_DIR = '/home/rauio/.local/share/Steam/userdata/1020642594/2868840/remote'
const HISTORY_DIR = path.join(SAVE_DIR, 'profile1/saves/history')

function loadRunFile(filename: string): unknown {
  const filePath = path.join(HISTORY_DIR, filename)
  const content = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(content)
}

function getAllRunFiles(): string[] {
  return fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.run'))
}

// ---- Parser tests ----

describe('parser', () => {
  it('should parse a valid .run file', () => {
    const raw = loadRunFile('1772807394.run')
    const result = parseRunFile(raw)
    expect(result.seed).toBe('PN8DFP6N5J')
    expect(result.ascension).toBe(0)
    expect(result.win).toBe(true)
    expect(result.acts).toEqual(['ACT.OVERGROWTH', 'ACT.HIVE', 'ACT.GLORY'])
    expect(result.players).toHaveLength(1)
    expect(result.players[0].character).toBe('CHARACTER.IRONCLAD')
    expect(result.map_point_history.length).toBeGreaterThan(0)
  })

  it('should parse a winning run', () => {
    const raw = loadRunFile('1772972121.run')
    const result = parseRunFile(raw)
    expect(result.win).toBe(true)
    expect(result.was_abandoned).toBe(false)
    expect(result.players[0].character).toBe('CHARACTER.SILENT')
  })

  it('should parse progress.save', () => {
    const content = fs.readFileSync(path.join(SAVE_DIR, 'profile1/saves/progress.save'), 'utf-8')
    const result = parseProgressFile(JSON.parse(content))
    expect(result.ancient_stats).toBeDefined()
    expect(result.ancient_stats.length).toBeGreaterThan(0)
  })

  it('should reject non-object input', () => {
    expect(() => parseRunFile('not an object')).toThrow(ParseError)
    expect(() => parseRunFile(42)).toThrow(ParseError)
    expect(() => parseRunFile(null)).toThrow(ParseError)
  })

  it('should reject missing required fields', () => {
    expect(() => parseRunFile({})).toThrow(ParseError)
  })

  it('should parse ALL .run files without error', () => {
    const files = getAllRunFiles()
    console.log(`Found ${files.length} .run files`)
    let errors = 0
    for (const file of files) {
      try {
        const raw = loadRunFile(file)
        parseRunFile(raw)
      } catch (e) {
        console.error(`Failed to parse ${file}:`, e)
        errors++
      }
    }
    expect(errors).toBe(0)
  })
})

// ---- Analytics tests ----

describe('analytics — single run', () => {
  const run = parseRunFile(loadRunFile('1772972121.run')) as RunFile

  it('getRunSummary returns correct summary', () => {
    const summary = getRunSummary(run)
    expect(summary.character).toBe('CHARACTER.SILENT')
    expect(summary.seed).toBe('65Y8VA3WFT')
    expect(summary.win).toBe(true)
    expect(summary.totalFloors).toBeGreaterThan(0)
    expect(summary.runTime).toBe(1644)
    expect(summary.deckSize).toBeGreaterThan(0)
    expect(summary.relicCount).toBeGreaterThan(0)
  })

  it('getHpTimeline returns points for each floor', () => {
    const timeline = getHpTimeline(run)
    expect(timeline.length).toBeGreaterThan(0)
    expect(timeline[0].floor).toBe(1)
    expect(timeline[0].hp).toBeGreaterThanOrEqual(0)
    expect(timeline[0].maxHp).toBeGreaterThan(0)
    // HP should never exceed maxHp
    for (const point of timeline) {
      expect(point.hp).toBeLessThanOrEqual(point.maxHp)
    }
  })

  it('getGoldTimeline returns points with non-negative gold', () => {
    const timeline = getGoldTimeline(run)
    expect(timeline.length).toBeGreaterThan(0)
    for (const point of timeline) {
      expect(point.gold).toBeGreaterThanOrEqual(0)
    }
  })

  it('getDeckEvolution tracks deck growth', () => {
    const evolution = getDeckEvolution(run)
    expect(evolution.length).toBeGreaterThan(0)
    // Deck should generally grow or stay the same
    for (const e of evolution) {
      expect(e.deckSize).toBeGreaterThan(0)
    }
  })

  it('getEncounterStats returns encounter details', () => {
    const encounters = getEncounterStats(run)
    expect(encounters.length).toBeGreaterThan(0)
    for (const enc of encounters) {
      expect(enc.encounter).toBeTruthy()
      expect(enc.turns).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('analytics — multi-run', () => {
  const allFiles = getAllRunFiles()
  const runs: RunFile[] = allFiles.map(f => parseRunFile(loadRunFile(f)) as RunFile)

  it('getWinRateByCharacter returns stats for all characters', () => {
    const rates = getWinRateByCharacter(runs)
    expect(rates.length).toBeGreaterThan(0)
    for (const r of rates) {
      expect(r.total).toBeGreaterThan(0)
      expect(r.winRate).toBeGreaterThanOrEqual(0)
      expect(r.winRate).toBeLessThanOrEqual(1)
      expect(r.wins + r.losses).toBe(r.total)
    }
  })

  it('getCardPickRate returns ranked cards', () => {
    const stats = getCardPickRate(runs)
    expect(stats.length).toBeGreaterThan(0)
    // Should be sorted by total descending
    for (let i = 1; i < stats.length; i++) {
      expect(stats[i].total).toBeLessThanOrEqual(stats[i - 1].total)
    }
  })

  it('getDeathCauseStats returns death encounters', () => {
    const stats = getDeathCauseStats(runs)
    // Some runs should have deaths
    expect(Array.isArray(stats)).toBe(true)
    if (stats.length > 0) {
      expect(stats[0].count).toBeGreaterThan(0)
    }
  })

  it('getRelicPickRate returns relic stats', () => {
    const stats = getRelicPickRate(runs)
    expect(stats.length).toBeGreaterThan(0)
  })

  it('getAscensionStats returns stats per level', () => {
    const stats = getAscensionStats(runs)
    expect(stats.length).toBeGreaterThan(0)
  })

  it('getFloorTypeDistribution returns floor type counts', () => {
    const dist = getFloorTypeDistribution(runs)
    expect(dist.length).toBeGreaterThan(0)
    const total = dist.reduce((sum, d) => sum + d.count, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('run count matches file count', () => {
    console.log(`Total runs: ${runs.length}`)
    console.log(`Characters: ${getWinRateByCharacter(runs).map(r => `${r.character} (${r.wins}W/${r.losses}L)`).join(', ')}`)
    expect(runs.length).toBe(allFiles.length)
  })
})

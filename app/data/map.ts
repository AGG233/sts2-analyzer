// Map generation logic for STS2 run visualization
// Converts linear floor sequence to a 2D map layout

import type { RunFile } from './types'

export interface MapNode {
  id: string
  floor: number
  type: string
  x: number
  y: number
  encounter?: string
  monsters?: string[]
  turns?: number
  isActive: boolean
  playerData?: Map<string, unknown>
}

export interface MapAct {
  actIndex: number
  actId: string
  nodes: MapNode[]
  startY: number
  endY: number
}

export interface MapData {
  acts: MapAct[]
  totalFloors: number
  maxX: number
}

// Room type colors
export const typeColors: Record<string, string> = {
  monster: '#42a5f5',
  elite: '#ef5350',
  boss: '#ab47bc',
  event: '#66bb6a',
  shop: '#ffa726',
  treasure: '#ffca28',
  rest_site: '#78909c',
  ancient: '#7e57c2',
  unknown: '#bdbdbd',
}

// Room type labels
const typeLabels: Record<string, string> = {
  monster: 'MON',
  elite: 'ELI',
  boss: 'BOSS',
  event: 'EVT',
  shop: 'SHOP',
  treasure: 'TRS',
  rest_site: 'REST',
  ancient: 'ANC',
  unknown: '???',
}

export function typeLabel(t: string): string {
  return typeLabels[t] ?? t
}

// Generate map data from a run file
export function generateMapData(run: RunFile): MapData {
  const acts: MapAct[] = []
  let currentY = 0
  const totalFloors = run.map_point_history.reduce((sum, act) => sum + act.length, 0)

  for (let actIndex = 0; actIndex < run.map_point_history.length; actIndex++) {
    const act = run.map_point_history[actIndex]
    const actId = run.acts[actIndex] ?? `ACT${actIndex + 1}`
    const nodes: MapNode[] = []
    const startY = currentY

    for (let floorIndex = 0; floorIndex < act.length; floorIndex++) {
      const point = act[floorIndex]
      const globalFloor = getGlobalFloorNumber(run, actIndex, floorIndex)

      // Generate x position - use small random variation for visual interest
      // but keep nodes mostly aligned in the center
      const baseX = 0.5
      const variation = (Math.sin(globalFloor * 1.3) * 0.15)
      const x = baseX + variation

      // Extract encounter info
      const room = point.rooms[0]
      const encounter = room?.model_id
      const monsters = room?.monster_ids
      const turns = room?.turns_taken

      nodes.push({
        id: `act${actIndex}-floor${floorIndex}`,
        floor: globalFloor,
        type: point.map_point_type,
        x,
        y: currentY,
        encounter,
        monsters,
        turns,
        isActive: true, // All nodes are part of the path
      })

      currentY++
    }

    acts.push({
      actIndex,
      actId,
      nodes,
      startY,
      endY: currentY - 1,
    })

    // Add small gap between acts
    currentY += 1.5
  }

  return {
    acts,
    totalFloors,
    maxX: 1,
  }
}

// Helper: calculate global floor number
function getGlobalFloorNumber(run: RunFile, actIndex: number, floorIndex: number): number {
  let total = 0
  for (let i = 0; i < actIndex; i++) {
    total += run.map_point_history[i].length
  }
  return total + floorIndex + 1
}

// Get connections between nodes for drawing lines
export function getNodeConnections(mapData: MapData): Array<{ from: MapNode, to: MapNode }> {
  const connections: Array<{ from: MapNode, to: MapNode }> = []

  for (const act of mapData.acts) {
    for (let i = 0; i < act.nodes.length - 1; i++) {
      connections.push({
        from: act.nodes[i],
        to: act.nodes[i + 1],
      })
    }
  }

  return connections
}

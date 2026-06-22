'use client'

import { useState, useRef } from 'react'
import {
  IconArrowBack,
  IconTrash,
  IconDeviceFloppy,
  IconX,
  IconChevronRight,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type MarkerKind = 'offense' | 'defense' | 'ball' | 'cone'
type LineKind = 'pass' | 'movement'
type Tool = MarkerKind | LineKind | 'eraser'

type Marker = {
  kind: 'marker'
  id: string
  type: MarkerKind
  x: number
  y: number
  num?: number
}

type PlayLine = {
  kind: 'line'
  id: string
  type: LineKind
  x1: number
  y1: number
  x2: number
  y2: number
}

type PlayElement = Marker | PlayLine

type SavedPlay = {
  id: string
  name: string
  category: string
  elements: PlayElement[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COURT_W = 500
const COURT_H = 470
const BLUE = '#6BA3D6'
const CATEGORIES = ['Offence', 'Defence', 'Out of Bounds', 'Press Break', 'Special Situations']

const SAMPLE_PLAYS: SavedPlay[] = [
  {
    id: 'horns',
    name: 'Horns Set',
    category: 'Offence',
    elements: [
      { kind: 'marker', id: 'h1', type: 'offense', num: 1, x: 250, y: 295 },
      { kind: 'marker', id: 'h2', type: 'offense', num: 2, x: 420, y: 340 },
      { kind: 'marker', id: 'h3', type: 'offense', num: 3, x: 80, y: 340 },
      { kind: 'marker', id: 'h4', type: 'offense', num: 4, x: 330, y: 195 },
      { kind: 'marker', id: 'h5', type: 'offense', num: 5, x: 170, y: 195 },
      { kind: 'marker', id: 'hb', type: 'ball', x: 250, y: 295 },
      { kind: 'line', id: 'hl1', type: 'movement', x1: 250, y1: 295, x2: 330, y2: 195 },
      { kind: 'line', id: 'hl2', type: 'pass', x1: 250, y1: 295, x2: 330, y2: 195 },
      { kind: 'line', id: 'hl3', type: 'movement', x1: 170, y1: 195, x2: 80, y2: 310 },
      { kind: 'line', id: 'hl4', type: 'movement', x1: 330, y1: 195, x2: 420, y2: 310 },
    ],
  },
  {
    id: 'zone131',
    name: '1-3-1 Zone',
    category: 'Defence',
    elements: [
      { kind: 'marker', id: 'z1', type: 'defense', num: 1, x: 250, y: 310 },
      { kind: 'marker', id: 'z2', type: 'defense', num: 2, x: 75, y: 225 },
      { kind: 'marker', id: 'z3', type: 'defense', num: 3, x: 250, y: 210 },
      { kind: 'marker', id: 'z4', type: 'defense', num: 4, x: 425, y: 225 },
      { kind: 'marker', id: 'z5', type: 'defense', num: 5, x: 250, y: 90 },
    ],
  },
  {
    id: 'box-oob',
    name: 'Box Out of Bounds',
    category: 'Out of Bounds',
    elements: [
      { kind: 'marker', id: 'b1', type: 'offense', num: 1, x: 250, y: 12 },
      { kind: 'marker', id: 'b2', type: 'offense', num: 2, x: 196, y: 75 },
      { kind: 'marker', id: 'b3', type: 'offense', num: 3, x: 304, y: 75 },
      { kind: 'marker', id: 'b4', type: 'offense', num: 4, x: 196, y: 135 },
      { kind: 'marker', id: 'b5', type: 'offense', num: 5, x: 304, y: 135 },
      { kind: 'line', id: 'bl1', type: 'movement', x1: 304, y1: 75, x2: 420, y2: 180 },
      { kind: 'line', id: 'bl2', type: 'movement', x1: 196, y1: 75, x2: 80, y2: 180 },
      { kind: 'line', id: 'bl3', type: 'pass', x1: 250, y1: 12, x2: 304, y2: 75 },
    ],
  },
]

// ─── Half Court SVG ───────────────────────────────────────────────────────────

function HalfCourt() {
  const s = { stroke: BLUE, strokeWidth: 1.5, fill: 'none' } as const
  const thick = { ...s, strokeWidth: 2 } as const

  return (
    <g>
      {/* Court boundary */}
      <rect x={5} y={5} width={490} height={460} fill="white" stroke={BLUE} strokeWidth={2} />

      {/* Key / Lane */}
      <rect x={170} y={5} width={160} height={190} {...s} />

      {/* Lane hash marks (2 blocks per side) */}
      {[75, 115].map((y) => (
        <g key={y}>
          <line x1={158} y1={y} x2={170} y2={y} {...s} />
          <line x1={330} y1={y} x2={342} y2={y} {...s} />
        </g>
      ))}

      {/* Free throw circle — upper half solid, lower half dashed */}
      <path d="M 190,195 A 60,60 0 0,1 310,195" {...s} />
      <path d="M 190,195 A 60,60 0 0,0 310,195" {...s} strokeDasharray="5,4" />

      {/* Backboard */}
      <line x1={224} y1={22} x2={276} y2={22} stroke={BLUE} strokeWidth={3} />

      {/* Rim */}
      <circle cx={250} cy={37} r={10} {...s} strokeWidth={2} />

      {/* Restricted arc */}
      <path d="M 226,37 A 24,24 0 0,0 274,37" {...s} />

      {/* Three-point line */}
      <line x1={35} y1={5} x2={35} y2={137} {...s} />
      <line x1={465} y1={5} x2={465} y2={137} {...s} />
      <path d="M 35,137 A 238,238 0 0,1 465,137" {...s} />

      {/* Half-court line indicator */}
      <line x1={5} y1={460} x2={495} y2={460} stroke={BLUE} strokeWidth={1} strokeOpacity={0.4} />
    </g>
  )
}

// ─── Marker rendering ─────────────────────────────────────────────────────────

function MarkerEl({ m, onClick }: { m: Marker; onClick?: () => void }) {
  if (m.type === 'offense') {
    return (
      <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <circle cx={m.x} cy={m.y} r={14} fill={BLUE} />
        <text x={m.x} y={m.y} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={11} fontWeight="bold" fontFamily="Arial,sans-serif">
          {m.num}
        </text>
      </g>
    )
  }
  if (m.type === 'defense') {
    return (
      <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <circle cx={m.x} cy={m.y} r={14} fill="#ef4444" />
        <text x={m.x} y={m.y} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={9} fontWeight="bold" fontFamily="Arial,sans-serif">
          X{m.num}
        </text>
      </g>
    )
  }
  if (m.type === 'ball') {
    return (
      <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <circle cx={m.x} cy={m.y} r={10} fill="#f97316" />
        <path d={`M ${m.x - 10},${m.y} Q ${m.x},${m.y - 6} ${m.x + 10},${m.y}`} fill="none" stroke="white" strokeWidth={1} />
        <path d={`M ${m.x - 10},${m.y} Q ${m.x},${m.y + 6} ${m.x + 10},${m.y}`} fill="none" stroke="white" strokeWidth={1} />
        <line x1={m.x} y1={m.y - 10} x2={m.x} y2={m.y + 10} stroke="white" strokeWidth={1} />
      </g>
    )
  }
  if (m.type === 'cone') {
    return (
      <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
        <polygon
          points={`${m.x},${m.y - 14} ${m.x - 10},${m.y + 8} ${m.x + 10},${m.y + 8}`}
          fill="#f97316"
          stroke="#ea580c"
          strokeWidth={1}
        />
        <line x1={m.x - 10} y1={m.y + 8} x2={m.x + 10} y2={m.y + 8} stroke="#ea580c" strokeWidth={1.5} />
      </g>
    )
  }
  return null
}

// ─── Line rendering ───────────────────────────────────────────────────────────

function LineEl({ l, onClick }: { l: PlayLine; onClick?: () => void }) {
  const dx = l.x2 - l.x1
  const dy = l.y2 - l.y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 2) return null

  const arrowId = `arrow-${l.id}`
  const color = l.type === 'pass' ? '#6BA3D6' : '#1f2937'

  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <defs>
        <marker id={arrowId} markerWidth={8} markerHeight={6} refX={8} refY={3} orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={color} />
        </marker>
      </defs>
      {/* Wider invisible hit area */}
      <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="transparent" strokeWidth={12} />
      <line
        x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={l.type === 'pass' ? '6,4' : undefined}
        markerEnd={l.type === 'movement' ? `url(#${arrowId})` : undefined}
        fill="none"
      />
    </g>
  )
}

// ─── Tool button ──────────────────────────────────────────────────────────────

function ToolBtn({
  active,
  onClick,
  title,
  children,
  danger,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition"
      style={
        danger
          ? { backgroundColor: '#fee2e2', color: '#ef4444' }
          : active
          ? { backgroundColor: BLUE, color: 'white' }
          : { backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb' }
      }
    >
      {children}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FormulaDrawPage() {
  const [activeTool, setActiveTool] = useState<Tool>('offense')
  const [offenseNum, setOffenseNum] = useState(1)
  const [defenseNum, setDefenseNum] = useState(1)

  const [markers, setMarkers] = useState<Marker[]>([])
  const [lines, setLines] = useState<PlayLine[]>([])
  const [history, setHistory] = useState<{ markers: Marker[]; lines: PlayLine[] }[]>([])

  const [drawing, setDrawing] = useState(false)
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null)
  const [linePreview, setLinePreview] = useState<{ x: number; y: number } | null>(null)

  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>(() => {
    if (typeof window === 'undefined') return SAMPLE_PLAYS
    try {
      const stored = localStorage.getItem('formulaDraw')
      return stored ? JSON.parse(stored) : SAMPLE_PLAYS
    } catch {
      return SAMPLE_PLAYS
    }
  })

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [newPlayName, setNewPlayName] = useState('')
  const [newPlayCategory, setNewPlayCategory] = useState('Offence')
  const [loadedPlayId, setLoadedPlayId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const svgRef = useRef<SVGSVGElement>(null)

  function push() {
    setHistory((h) => [...h.slice(-49), { markers, lines }])
  }

  function getSVGCoords(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * COURT_W,
      y: ((e.clientY - rect.top) / rect.height) * COURT_H,
    }
  }

  function uid() {
    return Math.random().toString(36).slice(2)
  }

  function handleSVGMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (e.target !== e.currentTarget && activeTool !== 'eraser') {
      // clicked on a marker/line element — let its own handler deal with it
    }
    const { x, y } = getSVGCoords(e)

    if (activeTool === 'pass' || activeTool === 'movement') {
      setDrawing(true)
      setLineStart({ x, y })
      setLinePreview({ x, y })
      return
    }

    if (activeTool === 'eraser') return

    // Place a marker
    push()
    const m: Marker = {
      kind: 'marker',
      id: uid(),
      type: activeTool as MarkerKind,
      x,
      y,
      num: activeTool === 'offense' ? offenseNum : activeTool === 'defense' ? defenseNum : undefined,
    }
    setMarkers((prev) => [...prev, m])
    setLoadedPlayId(null)
  }

  function handleSVGMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!drawing || !lineStart) return
    const { x, y } = getSVGCoords(e)
    setLinePreview({ x, y })
  }

  function handleSVGMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (!drawing || !lineStart) return
    setDrawing(false)
    const { x, y } = getSVGCoords(e)
    const dx = x - lineStart.x
    const dy = y - lineStart.y
    if (Math.sqrt(dx * dx + dy * dy) > 20) {
      push()
      const l: PlayLine = {
        kind: 'line',
        id: uid(),
        type: activeTool as LineKind,
        x1: lineStart.x,
        y1: lineStart.y,
        x2: x,
        y2: y,
      }
      setLines((prev) => [...prev, l])
      setLoadedPlayId(null)
    }
    setLineStart(null)
    setLinePreview(null)
  }

  function eraseMarker(id: string) {
    push()
    setMarkers((prev) => prev.filter((m) => m.id !== id))
    setLoadedPlayId(null)
  }

  function eraseLine(id: string) {
    push()
    setLines((prev) => prev.filter((l) => l.id !== id))
    setLoadedPlayId(null)
  }

  function handleUndo() {
    const prev = history[history.length - 1]
    if (!prev) return
    setMarkers(prev.markers)
    setLines(prev.lines)
    setHistory((h) => h.slice(0, -1))
    setLoadedPlayId(null)
  }

  function handleClear() {
    push()
    setMarkers([])
    setLines([])
    setLoadedPlayId(null)
  }

  function handleSavePlay() {
    if (!newPlayName.trim()) return
    const play: SavedPlay = {
      id: loadedPlayId && !savedPlays.find((p) => p.id === loadedPlayId)
        ? loadedPlayId
        : uid(),
      name: newPlayName.trim(),
      category: newPlayCategory,
      elements: [
        ...markers,
        ...lines,
      ],
    }
    setSavedPlays((prev) => {
      const updated = loadedPlayId
        ? prev.map((p) => (p.id === loadedPlayId ? { ...play, id: p.id } : p))
        : [...prev, play]
      localStorage.setItem('formulaDraw', JSON.stringify(updated))
      return updated
    })
    setShowSaveModal(false)
    setNewPlayName('')
  }

  function loadPlay(play: SavedPlay) {
    push()
    setMarkers(play.elements.filter((e): e is Marker => e.kind === 'marker'))
    setLines(play.elements.filter((e): e is PlayLine => e.kind === 'line'))
    setLoadedPlayId(play.id)
  }

  function deletePlay(id: string) {
    setSavedPlays((prev) => {
      const updated = prev.filter((p) => p.id !== id)
      localStorage.setItem('formulaDraw', JSON.stringify(updated))
      return updated
    })
    if (loadedPlayId === id) setLoadedPlayId(null)
  }

  function openSaveModal() {
    const current = loadedPlayId ? savedPlays.find((p) => p.id === loadedPlayId) : null
    setNewPlayName(current?.name ?? '')
    setNewPlayCategory(current?.category ?? 'Offence')
    setShowSaveModal(true)
  }

  const allCategories = ['All', ...CATEGORIES]
  const filteredPlays = selectedCategory === 'All'
    ? savedPlays
    : savedPlays.filter((p) => p.category === selectedCategory)

  const cursor =
    activeTool === 'eraser' ? 'crosshair'
    : activeTool === 'pass' || activeTool === 'movement' ? 'crosshair'
    : 'crosshair'

  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ backgroundColor: '#f4f6f9' }}>
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">FormulaDraw</h1>
        <p className="text-sm text-gray-500">Design and save basketball plays</p>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Offence players */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            <span className="px-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">Off</span>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => { setActiveTool('offense'); setOffenseNum(n) }}
                className="h-8 w-8 rounded-md text-xs font-bold transition"
                style={
                  activeTool === 'offense' && offenseNum === n
                    ? { backgroundColor: BLUE, color: 'white' }
                    : { backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb' }
                }
              >
                {n}
              </button>
            ))}
          </div>

          {/* Defence players */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
            <span className="px-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">Def</span>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => { setActiveTool('defense'); setDefenseNum(n) }}
                className="h-8 w-8 rounded-md text-xs font-bold transition"
                style={
                  activeTool === 'defense' && defenseNum === n
                    ? { backgroundColor: '#ef4444', color: 'white' }
                    : { backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb' }
                }
              >
                X{n}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-200" />

          {/* Ball */}
          <ToolBtn active={activeTool === 'ball'} onClick={() => setActiveTool('ball')} title="Ball">
            <span className="text-base">🏀</span>
            <span>Ball</span>
          </ToolBtn>

          {/* Cone */}
          <ToolBtn active={activeTool === 'cone'} onClick={() => setActiveTool('cone')} title="Cone">
            <span className="text-base">🔶</span>
            <span>Cone</span>
          </ToolBtn>

          <div className="h-6 w-px bg-gray-200" />

          {/* Pass line */}
          <ToolBtn active={activeTool === 'pass'} onClick={() => setActiveTool('pass')} title="Draw pass line (dashed)">
            <svg width={28} height={14} style={{ display: 'block' }}>
              <line x1={2} y1={7} x2={26} y2={7} stroke="currentColor" strokeWidth={2} strokeDasharray="4,3" />
            </svg>
            <span>Pass</span>
          </ToolBtn>

          {/* Movement line */}
          <ToolBtn active={activeTool === 'movement'} onClick={() => setActiveTool('movement')} title="Draw movement arrow">
            <svg width={28} height={14} style={{ display: 'block' }}>
              <defs>
                <marker id="tb-arr" markerWidth={6} markerHeight={5} refX={6} refY={2.5} orient="auto">
                  <polygon points="0 0, 6 2.5, 0 5" fill="currentColor" />
                </marker>
              </defs>
              <line x1={2} y1={7} x2={22} y2={7} stroke="currentColor" strokeWidth={2} markerEnd="url(#tb-arr)" />
            </svg>
            <span>Move</span>
          </ToolBtn>

          <div className="h-6 w-px bg-gray-200" />

          {/* Eraser */}
          <ToolBtn active={activeTool === 'eraser'} onClick={() => setActiveTool('eraser')} title="Eraser — click elements to delete">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20H7L3 16L13 6L21 14L17.5 17.5" />
              <line x1={6} y1={14} x2={14} y2={6} />
            </svg>
            <span>Erase</span>
          </ToolBtn>

          {/* Undo */}
          <ToolBtn active={false} onClick={handleUndo} title="Undo last action">
            <IconArrowBack size={15} />
            <span>Undo</span>
          </ToolBtn>

          {/* Clear */}
          <ToolBtn active={false} onClick={handleClear} title="Clear all" danger>
            <IconTrash size={15} />
            <span>Clear</span>
          </ToolBtn>

          <div className="ml-auto">
            <button
              type="button"
              onClick={openSaveModal}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: BLUE }}
            >
              <IconDeviceFloppy size={16} />
              {loadedPlayId ? 'Update Play' : 'Save Play'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        {/* Court */}
        <div className="flex min-w-0 flex-1 items-start justify-center">
          <div
            className="relative rounded-2xl shadow-md"
            style={{ width: '100%', maxWidth: 560, backgroundColor: 'white' }}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${COURT_W} ${COURT_H}`}
              style={{ display: 'block', width: '100%', height: 'auto', cursor, userSelect: 'none', borderRadius: 16 }}
              onMouseDown={handleSVGMouseDown}
              onMouseMove={handleSVGMouseMove}
              onMouseUp={handleSVGMouseUp}
              onMouseLeave={() => {
                if (drawing) {
                  setDrawing(false)
                  setLineStart(null)
                  setLinePreview(null)
                }
              }}
            >
              <HalfCourt />

              {/* Rendered lines */}
              {lines.map((l) => (
                <LineEl
                  key={l.id}
                  l={l}
                  onClick={activeTool === 'eraser' ? () => eraseLine(l.id) : undefined}
                />
              ))}

              {/* Line preview while drawing */}
              {drawing && lineStart && linePreview && (
                <line
                  x1={lineStart.x}
                  y1={lineStart.y}
                  x2={linePreview.x}
                  y2={linePreview.y}
                  stroke={activeTool === 'pass' ? BLUE : '#1f2937'}
                  strokeWidth={2}
                  strokeDasharray={activeTool === 'pass' ? '6,4' : undefined}
                  strokeOpacity={0.5}
                  pointerEvents="none"
                />
              )}

              {/* Rendered markers */}
              {markers.map((m) => (
                <MarkerEl
                  key={m.id}
                  m={m}
                  onClick={activeTool === 'eraser' ? () => eraseMarker(m.id) : undefined}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Saved plays sidebar */}
        <div
          className="flex w-64 shrink-0 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Saved Plays</h2>
          </div>

          {/* Category filter */}
          <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 py-2 scrollbar-none">
            {allCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition"
                style={
                  selectedCategory === cat
                    ? { backgroundColor: BLUE, color: 'white' }
                    : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                }
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Plays list */}
          <div className="flex-1 overflow-y-auto">
            {filteredPlays.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">No plays yet</p>
            ) : (
              filteredPlays.map((play) => (
                <div
                  key={play.id}
                  className="group flex items-center gap-2 border-b border-gray-50 px-3 py-2.5 transition hover:bg-gray-50"
                >
                  <button
                    type="button"
                    onClick={() => loadPlay(play)}
                    className="flex min-w-0 flex-1 flex-col text-left"
                  >
                    <span
                      className="truncate text-sm font-semibold"
                      style={{ color: loadedPlayId === play.id ? BLUE : '#111827' }}
                    >
                      {play.name}
                    </span>
                    <span className="text-[11px] text-gray-400">{play.category}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPlay(play)}
                    className="shrink-0 rounded-lg p-1 text-gray-300 transition hover:text-blue-500"
                    title="Load play"
                  >
                    <IconChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePlay(play.id)}
                    className="shrink-0 rounded-lg p-1 text-gray-300 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                    title="Delete play"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Court legend */}
          <div className="border-t border-gray-100 px-3 py-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Legend</p>
            <div className="flex items-center gap-2">
              <svg width={20} height={20}><circle cx={10} cy={10} r={8} fill={BLUE} /><text x={10} y={10} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={9} fontWeight="bold" fontFamily="Arial,sans-serif">1</text></svg>
              <span className="text-xs text-gray-500">Offence player</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width={20} height={20}><circle cx={10} cy={10} r={8} fill="#ef4444" /><text x={10} y={10} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={7} fontWeight="bold" fontFamily="Arial,sans-serif">X1</text></svg>
              <span className="text-xs text-gray-500">Defence player</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width={28} height={12}>
                <line x1={2} y1={6} x2={26} y2={6} stroke={BLUE} strokeWidth={2} strokeDasharray="4,3" />
              </svg>
              <span className="text-xs text-gray-500">Pass</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width={28} height={12}>
                <defs>
                  <marker id="lg-arr" markerWidth={6} markerHeight={5} refX={6} refY={2.5} orient="auto">
                    <polygon points="0 0, 6 2.5, 0 5" fill="#1f2937" />
                  </marker>
                </defs>
                <line x1={2} y1={6} x2={22} y2={6} stroke="#1f2937" strokeWidth={2} markerEnd="url(#lg-arr)" />
              </svg>
              <span className="text-xs text-gray-500">Movement</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Play Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {loadedPlayId ? 'Update Play' : 'Save Play'}
              </h2>
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Play Name
                </label>
                <input
                  type="text"
                  value={newPlayName}
                  onChange={(e) => setNewPlayName(e.target.value)}
                  placeholder="e.g. Horns Set"
                  autoFocus
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSavePlay() }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewPlayCategory(cat)}
                      className="rounded-full px-3 py-1 text-xs font-semibold transition"
                      style={
                        newPlayCategory === cat
                          ? { backgroundColor: BLUE, color: 'white' }
                          : { backgroundColor: '#f3f4f6', color: '#6b7280' }
                      }
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePlay}
                disabled={!newPlayName.trim()}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: BLUE }}
              >
                {loadedPlayId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

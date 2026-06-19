'use client'

import { useState, useRef } from 'react'
import {
  IconPlus, IconX, IconTrash, IconCheck, IconTag,
  IconCalendar, IconDotsVertical, IconArrowLeft,
  IconLayoutKanban, IconPencil,
} from '@tabler/icons-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'urgent' | 'high' | 'medium' | 'low'

interface KanbanCard {
  id: string
  title: string
  description: string
  labelIds: string[]
  assignee: string
  dueDate: string
  priority: Priority
  createdAt: string
}

interface KanbanColumn {
  id: string
  title: string
  color: string
  cards: KanbanCard[]
  limit?: number
}

interface KanbanBoard {
  id: string
  title: string
  description: string
  color: string
  columns: KanbanColumn[]
  createdAt: string
}

interface Label {
  id: string
  name: string
  color: string
  bg: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'

const LABELS: Label[] = [
  { id: 'l1', name: 'Program',       color: '#1d4ed8', bg: '#dbeafe' },
  { id: 'l2', name: 'Athlete Focus', color: '#15803d', bg: '#dcfce7' },
  { id: 'l3', name: 'Research',      color: '#6d28d9', bg: '#ede9fe' },
  { id: 'l4', name: 'Admin',         color: '#374151', bg: '#f3f4f6' },
  { id: 'l5', name: 'Equipment',     color: '#92400e', bg: '#fef3c7' },
  { id: 'l6', name: 'Facility',      color: '#c2410c', bg: '#ffedd5' },
  { id: 'l7', name: 'Urgent',        color: '#b91c1c', bg: '#fee2e2' },
]
const LABEL_MAP = Object.fromEntries(LABELS.map(l => [l.id, l]))

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  urgent: { color: '#ef4444', label: 'Urgent' },
  high:   { color: '#f97316', label: 'High'   },
  medium: { color: '#6BA3D6', label: 'Medium' },
  low:    { color: '#d1d5db', label: 'Low'    },
}

const BOARD_COLORS = ['#6BA3D6','#6BAD6B','#D4A843','#B06BAD','#6BBDAD','#AD6B7A','#7C3AED','#ef4444']

const COL_DOT: Record<string, string> = {
  '#f1f3f5': '#9ca3af',
  '#dbeafe': '#6BA3D6',
  '#fef3c7': '#f59e0b',
  '#dcfce7': '#22c55e',
  '#fee2e2': '#ef4444',
  '#ede9fe': '#7C3AED',
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-[#6BA3D6] focus:ring-2 focus:ring-[#6BA3D6]/10'
const LABEL_CLS = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9) }

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}
function dueDays(iso: string) {
  return Math.floor((new Date(iso + 'T00:00:00').getTime() - Date.now()) / 86_400_000)
}
function dueDateStyle(iso: string) {
  const d = dueDays(iso)
  if (d < 0)  return { color: '#ef4444', bg: '#fee2e2' }
  if (d <= 3) return { color: '#c2410c', bg: '#ffedd5' }
  return { color: '#6b7280', bg: '#f3f4f6' }
}

// ─── Sample data ──────────────────────────────────────────────────────────────

function mk(o: Pick<KanbanCard,'id'|'title'> & Partial<KanbanCard>): KanbanCard {
  return { description:'', labelIds:[], assignee:'', dueDate:'', priority:'medium', createdAt:'2026-06-01', ...o }
}

const INIT_BOARDS: KanbanBoard[] = [
  {
    id:'b1', title:'Season Planning', color:'#6BA3D6',
    description:'High-level planning for the training season, camps, and programs.',
    createdAt:'2026-04-01',
    columns:[
      { id:'c1-1', title:'Ideas', color:'#f1f3f5', cards:[
        mk({ id:'k11', title:'Design pre-season testing protocol', priority:'medium', labelIds:['l1'], assignee:'Matt Brasser' }),
        mk({ id:'k12', title:'Research strength & conditioning methods', priority:'low', labelIds:['l3'] }),
        mk({ id:'k13', title:'Create end-of-season review template', priority:'medium', labelIds:['l4'] }),
      ]},
      { id:'c1-2', title:'Planned', color:'#dbeafe', cards:[
        mk({ id:'k14', title:'Book venue for July winter camp', priority:'high', dueDate:'2026-07-01', assignee:'Matt Brasser' }),
        mk({ id:'k15', title:'Design skills assessment rubric', priority:'medium', labelIds:['l1'] }),
        mk({ id:'k16', title:'Plan team bonding event', priority:'low', dueDate:'2026-07-15' }),
      ]},
      { id:'c1-3', title:'In Progress', color:'#fef3c7', cards:[
        mk({ id:'k17', title:'Develop Q3 training schedule', priority:'high', labelIds:['l1'], assignee:'Matt Brasser', dueDate:'2026-06-30' }),
        mk({ id:'k18', title:'Organise rep trials program', priority:'urgent', labelIds:['l7'], assignee:'Matt Brasser', dueDate:'2026-06-25' }),
      ]},
      { id:'c1-4', title:'Done', color:'#dcfce7', cards:[
        mk({ id:'k19', title:'Complete summer training wrap-up', priority:'medium', assignee:'Matt Brasser', createdAt:'2026-05-01' }),
        mk({ id:'k1a', title:'Onboard new athletes — June cohort', priority:'high', assignee:'Jade Wilson', createdAt:'2026-06-02' }),
      ]},
    ],
  },
  {
    id:'b2', title:'Athlete Development', color:'#6BAD6B',
    description:'Tracking individual athlete goals, skill targets, and development milestones.',
    createdAt:'2026-04-15',
    columns:[
      { id:'c2-1', title:'Identified', color:'#f1f3f5', cards:[
        mk({ id:'k21', title:'Jordan — defensive positioning', priority:'high', labelIds:['l2'], assignee:'Matt Brasser' }),
        mk({ id:'k22', title:'Kai — left-hand drive development', priority:'medium', labelIds:['l2'] }),
        mk({ id:'k23', title:'Sam — post footwork fundamentals', priority:'low', labelIds:['l2'] }),
      ]},
      { id:'c2-2', title:'Goal Set', color:'#dbeafe', cards:[
        mk({ id:'k24', title:'Aisha — shooting off the dribble', priority:'high', labelIds:['l2'], dueDate:'2026-08-01', assignee:'Jade Wilson',
          description:'Focus on pull-up jumper and floater. Target: 40% from mid-range off the dribble.' }),
        mk({ id:'k25', title:'Marcus — off-ball movement & cutting', priority:'high', labelIds:['l2'], assignee:'Matt Brasser' }),
      ]},
      { id:'c2-3', title:'In Progress', color:'#fef3c7', cards:[
        mk({ id:'k26', title:'Liam — ball handling fundamentals', priority:'medium', labelIds:['l2','l1'], assignee:'Matt Brasser',
          description:'6-week program targeting weak-hand dribbling and change of direction.' }),
        mk({ id:'k27', title:'Priya — three-point range extension', priority:'medium', labelIds:['l1'], dueDate:'2026-07-01', assignee:'Jade Wilson' }),
        mk({ id:'k28', title:'Tyler — mid-range pull-up', priority:'medium', labelIds:['l2'], assignee:'Jade Wilson' }),
      ]},
      { id:'c2-4', title:'Achieved', color:'#dcfce7', cards:[
        mk({ id:'k29', title:'Devon — layup package (both hands)', priority:'medium', labelIds:['l2'], assignee:'Matt Brasser', createdAt:'2026-05-10' }),
        mk({ id:'k2a', title:'Zara — basic defensive stance & slides', priority:'medium', labelIds:['l2'], assignee:'Jade Wilson', createdAt:'2026-05-20' }),
      ]},
    ],
  },
  {
    id:'b3', title:'Facility & Ops', color:'#D4A843',
    description:'Facility maintenance, equipment purchases, and operational tasks.',
    createdAt:'2026-05-01',
    columns:[
      { id:'c3-1', title:'To Do', color:'#f1f3f5', cards:[
        mk({ id:'k31', title:'Replace court boundary tape', priority:'high', labelIds:['l5'], dueDate:'2026-06-30', assignee:'Matt Brasser' }),
        mk({ id:'k32', title:'Service HVAC system', priority:'urgent', labelIds:['l6','l7'], dueDate:'2026-06-20' }),
        mk({ id:'k33', title:'Order new training bibs (×20)', priority:'medium', labelIds:['l5'], assignee:'Matt Brasser' }),
        mk({ id:'k34', title:'Install additional storage shelving', priority:'low', labelIds:['l6'] }),
      ]},
      { id:'c3-2', title:'In Progress', color:'#fef3c7', cards:[
        mk({ id:'k35', title:'Update facility safety signage', priority:'high', labelIds:['l6'], assignee:'Jade Wilson' }),
        mk({ id:'k36', title:'Repair scoreboard display', priority:'medium', labelIds:['l5'] }),
      ]},
      { id:'c3-3', title:'Done', color:'#dcfce7', cards:[
        mk({ id:'k37', title:'Deep clean of changerooms', priority:'medium', labelIds:['l6'], assignee:'Jade Wilson', createdAt:'2026-06-01' }),
        mk({ id:'k38', title:'Purchase new ball bag', priority:'low', labelIds:['l5'], createdAt:'2026-05-20' }),
        mk({ id:'k39', title:'Renew public liability insurance', priority:'urgent', labelIds:['l7','l4'], assignee:'Matt Brasser', createdAt:'2026-05-15' }),
      ]},
    ],
  },
]

// ─── Add-card inline form ─────────────────────────────────────────────────────

function AddCardForm({ onAdd, onCancel }: { onAdd: (t: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  function submit() { if (title.trim()) { onAdd(title.trim()); setTitle('') } }
  return (
    <div className="mt-2 rounded-xl border border-[#6BA3D6] bg-white p-3 shadow-sm">
      <textarea autoFocus rows={2} value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } if (e.key === 'Escape') onCancel() }}
        placeholder="Card title…"
        className="w-full resize-none text-sm text-gray-900 outline-none" />
      <div className="mt-2 flex gap-2">
        <button onClick={submit} disabled={!title.trim()}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: ACCENT }}>
          Add Card
        </button>
        <button onClick={onCancel} className="rounded-lg px-2 py-1.5 text-gray-400 hover:bg-gray-100"><IconX size={14} /></button>
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function CardComp({ card, isDragging, onClick, onDragStart, onDragEnd }: {
  card: KanbanCard
  isDragging: boolean
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const prio = PRIORITY_CONFIG[card.priority]
  const ds = card.dueDate ? dueDateStyle(card.dueDate) : null
  const d = card.dueDate ? dueDays(card.dueDate) : null

  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      className="cursor-pointer rounded-xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md select-none"
      style={{ opacity: isDragging ? 0.35 : 1, borderLeft: `3px solid ${prio.color}` }}>
      <div className="p-3">
        {card.labelIds.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {card.labelIds.map(lid => {
              const l = LABEL_MAP[lid]; if (!l) return null
              return <span key={lid} className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: l.bg, color: l.color }}>{l.name}</span>
            })}
          </div>
        )}
        <p className="text-sm font-medium leading-snug text-gray-900">{card.title}</p>
        {card.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">{card.description}</p>
        )}
        {(card.dueDate || card.assignee) && (
          <div className="mt-2.5 flex items-center gap-2">
            {card.dueDate && (
              <span className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: ds!.bg, color: ds!.color }}>
                <IconCalendar size={10} />
                {fmtDate(card.dueDate)}
                {d !== null && d < 0 && ' · Overdue'}
                {d !== null && d === 0 && ' · Today'}
              </span>
            )}
            {card.assignee && (
              <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: ACCENT }}>
                {card.assignee.split(' ').map(w => w[0]).slice(0,2).join('')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card detail panel ────────────────────────────────────────────────────────

function CardPanel({ card, colId, board, onUpdate, onMove, onDelete, onClose }: {
  card: KanbanCard; colId: string; board: KanbanBoard
  onUpdate: (p: Partial<KanbanCard>) => void
  onMove: (toColId: string) => void
  onDelete: () => void; onClose: () => void
}) {
  const [title, setTitle]       = useState(card.title)
  const [desc, setDesc]         = useState(card.description)
  const [assignee, setAssignee] = useState(card.assignee)
  const [dueDate, setDueDate]   = useState(card.dueDate)
  const [priority, setPriority] = useState<Priority>(card.priority)
  const [labelIds, setLabelIds] = useState<string[]>(card.labelIds)
  const [showLabels, setShowLabels] = useState(false)

  function flush(patch: Partial<KanbanCard> = {}) {
    onUpdate({ title: title.trim() || card.title, description: desc, assignee, dueDate, priority, labelIds, ...patch })
  }

  function toggleLabel(lid: string) {
    const next = labelIds.includes(lid) ? labelIds.filter(x => x !== lid) : [...labelIds, lid]
    setLabelIds(next); onUpdate({ labelIds: next })
  }

  const otherCols = board.columns.filter(c => c.id !== colId)

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={() => { flush(); onClose() }} />
      <div className="fixed right-0 top-0 z-40 flex h-screen w-[420px] flex-col bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-1.5 rounded-full" style={{ backgroundColor: PRIORITY_CONFIG[priority].color }} />
            <span className="text-xs font-semibold text-gray-400">
              {board.columns.find(c => c.id === colId)?.title}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => { onDelete() }}
              className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-400">
              <IconTrash size={16} />
            </button>
            <button onClick={() => { flush(); onClose() }}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <IconX size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <div>
            <label className={LABEL_CLS}>Title</label>
            <textarea rows={2} value={title} onChange={e => setTitle(e.target.value)} onBlur={() => flush()}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-[#6BA3D6]" />
          </div>

          <div>
            <label className={LABEL_CLS}>Description</label>
            <textarea rows={4} value={desc} onChange={e => setDesc(e.target.value)} onBlur={() => flush()}
              placeholder="Add a description…" className={INPUT + ' resize-none'} />
          </div>

          <div>
            <label className={LABEL_CLS}>Priority</label>
            <div className="flex gap-2">
              {(Object.entries(PRIORITY_CONFIG) as [Priority, { color: string; label: string }][]).map(([p, cfg]) => (
                <button key={p} onClick={() => { setPriority(p); flush({ priority: p }) }}
                  className="flex-1 rounded-xl border py-1.5 text-xs font-semibold transition"
                  style={priority === p
                    ? { backgroundColor: cfg.color, color:'white', borderColor: cfg.color }
                    : { borderColor:'#e5e7eb', color:'#6b7280' }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Labels</label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {labelIds.map(lid => {
                const l = LABEL_MAP[lid]; if (!l) return null
                return (
                  <span key={lid} onClick={() => toggleLabel(lid)}
                    className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: l.bg, color: l.color }}>
                    {l.name}<IconX size={9} />
                  </span>
                )
              })}
              <button onClick={() => setShowLabels(p => !p)}
                className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-400 hover:border-[#6BA3D6] hover:text-[#6BA3D6]">
                <IconTag size={10} /> Add
              </button>
            </div>
            {showLabels && (
              <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm space-y-1">
                {LABELS.map(l => {
                  const on = labelIds.includes(l.id)
                  return (
                    <button key={l.id} onClick={() => toggleLabel(l.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                      <span className="flex-1 rounded-full px-2 py-0.5 text-left text-xs font-semibold"
                        style={{ backgroundColor: l.bg, color: l.color }}>{l.name}</span>
                      {on && <IconCheck size={13} style={{ color: ACCENT }} />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <label className={LABEL_CLS}>Assignee</label>
            <input type="text" value={assignee} onChange={e => setAssignee(e.target.value)} onBlur={() => flush()}
              placeholder="e.g. Matt Brasser" className={INPUT} />
          </div>

          <div>
            <label className={LABEL_CLS}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); flush({ dueDate: e.target.value }) }}
              className={INPUT + ' max-w-xs'} />
            {dueDate && (
              <button onClick={() => { setDueDate(''); flush({ dueDate: '' }) }}
                className="mt-1 text-xs text-gray-400 hover:text-red-400">Clear date</button>
            )}
          </div>

          {otherCols.length > 0 && (
            <div>
              <label className={LABEL_CLS}>Move to Column</label>
              <div className="flex flex-wrap gap-2">
                {otherCols.map(col => (
                  <button key={col.id} onClick={() => { onMove(col.id); onClose() }}
                    className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[#6BA3D6] hover:text-[#6BA3D6]">
                    → {col.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

function ColumnComp({ column, isDropTarget, dragCardId, onCardClick, onAddCard, onDeleteColumn,
  onRenameColumn, onDragOver, onDrop, onCardDragStart, onCardDragEnd }: {
  column: KanbanColumn; isDropTarget: boolean; dragCardId: string | null
  onCardClick: (c: KanbanCard) => void; onAddCard: (t: string) => void
  onDeleteColumn: () => void; onRenameColumn: (t: string) => void
  onDragOver: (e: React.DragEvent) => void; onDrop: () => void
  onCardDragStart: (id: string) => void; onCardDragEnd: () => void
}) {
  const [addingCard, setAddingCard] = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [renaming, setRenaming]   = useState(false)
  const [nameVal, setNameVal]     = useState(column.title)
  const dotColor = COL_DOT[column.color] ?? '#9ca3af'
  const atLimit  = column.limit !== undefined && column.cards.length >= column.limit

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-2xl transition"
      style={{ backgroundColor: isDropTarget ? '#eff6ff' : '#f1f3f5',
        outline: isDropTarget ? `2px solid ${ACCENT}` : 'none' }}
      onDragOver={onDragOver}
      onDrop={e => { e.preventDefault(); onDrop() }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
        {renaming ? (
          <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
            onBlur={() => { onRenameColumn(nameVal.trim() || column.title); setRenaming(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter') { onRenameColumn(nameVal.trim() || column.title); setRenaming(false) }
              if (e.key === 'Escape') setRenaming(false)
            }}
            className="flex-1 rounded bg-white px-1.5 py-0.5 text-sm font-bold text-gray-900 outline-none" />
        ) : (
          <span className="flex-1 text-sm font-bold text-gray-700">{column.title}</span>
        )}
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-gray-500 shadow-sm">
          {column.cards.length}{column.limit ? `/${column.limit}` : ''}
        </span>
        <div className="relative">
          <button onClick={() => setMenuOpen(p => !p)}
            className="rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-600">
            <IconDotsVertical size={14} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-7 z-20 w-40 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                <button onClick={() => { setRenaming(true); setMenuOpen(false) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <IconPencil size={14} /> Rename
                </button>
                <button onClick={() => { onDeleteColumn(); setMenuOpen(false) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50">
                  <IconTrash size={14} /> Delete column
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-1" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        {column.cards.map(c => (
          <CardComp key={c.id} card={c}
            isDragging={dragCardId === c.id}
            onClick={() => onCardClick(c)}
            onDragStart={() => onCardDragStart(c.id)}
            onDragEnd={onCardDragEnd} />
        ))}
        {atLimit && (
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 py-2 text-center text-xs text-amber-600">
            WIP limit reached
          </div>
        )}
      </div>

      {/* Add card */}
      <div className="px-3 pb-3 pt-1">
        {addingCard ? (
          <AddCardForm onAdd={t => { onAddCard(t); setAddingCard(false) }} onCancel={() => setAddingCard(false)} />
        ) : (
          <button onClick={() => setAddingCard(true)} disabled={atLimit}
            className="flex w-full items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold text-gray-400 transition hover:bg-white hover:text-gray-600 disabled:opacity-40">
            <IconPlus size={14} /> Add card
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Board view ───────────────────────────────────────────────────────────────

function BoardView({ board, onUpdate, onDelete, onBack }: {
  board: KanbanBoard
  onUpdate: (b: KanbanBoard) => void
  onDelete: () => void
  onBack: () => void
}) {
  const [selectedCard, setSelectedCard] = useState<{ card: KanbanCard; colId: string } | null>(null)
  const [addingCol, setAddingCol]     = useState(false)
  const [newColTitle, setNewColTitle] = useState('')
  const [dragInfo, setDragInfo]       = useState<{ cardId: string; fromColId: string } | null>(null)
  const [dropColId, setDropColId]     = useState<string | null>(null)
  const [boardMenu, setBoardMenu]     = useState(false)

  function mutate(fn: (b: KanbanBoard) => KanbanBoard) { onUpdate(fn(board)) }

  function addCard(colId: string, title: string) {
    mutate(b => ({
      ...b,
      columns: b.columns.map(c => c.id !== colId ? c : {
        ...c, cards: [...c.cards, mk({ id: uid(), title, createdAt: new Date().toISOString().split('T')[0] })]
      })
    }))
  }

  function updateCard(colId: string, cardId: string, patch: Partial<KanbanCard>) {
    mutate(b => ({
      ...b,
      columns: b.columns.map(c => c.id !== colId ? c : {
        ...c, cards: c.cards.map(k => k.id !== cardId ? k : { ...k, ...patch })
      })
    }))
    setSelectedCard(p => p?.card.id === cardId ? { ...p, card: { ...p.card, ...patch } } : p)
  }

  function moveCard(cardId: string, fromColId: string, toColId: string) {
    if (fromColId === toColId) return
    mutate(b => {
      const moving = b.columns.find(c => c.id === fromColId)?.cards.find(k => k.id === cardId)
      if (!moving) return b
      return {
        ...b,
        columns: b.columns.map(c => {
          if (c.id === fromColId) return { ...c, cards: c.cards.filter(k => k.id !== cardId) }
          if (c.id === toColId)   return { ...c, cards: [...c.cards, moving] }
          return c
        })
      }
    })
  }

  function deleteCard(colId: string, cardId: string) {
    mutate(b => ({ ...b, columns: b.columns.map(c => c.id !== colId ? c : { ...c, cards: c.cards.filter(k => k.id !== cardId) }) }))
    setSelectedCard(null)
  }

  function addColumn(title: string) {
    mutate(b => ({ ...b, columns: [...b.columns, { id: uid(), title, color: '#f1f3f5', cards: [] }] }))
  }

  function deleteColumn(colId: string) {
    mutate(b => ({ ...b, columns: b.columns.filter(c => c.id !== colId) }))
  }

  function renameColumn(colId: string, title: string) {
    mutate(b => ({ ...b, columns: b.columns.map(c => c.id !== colId ? c : { ...c, title }) }))
  }

  const totalCards = board.columns.reduce((s, c) => s + c.cards.length, 0)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition">
            <IconArrowLeft size={15} /> Boards
          </button>
          <span className="text-gray-300">/</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: board.color }}>
            {board.title[0]}
          </div>
          <h1 className="text-lg font-bold text-gray-900">{board.title}</h1>
          {board.description && <span className="hidden text-sm text-gray-400 lg:block">· {board.description}</span>}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-gray-400">{board.columns.length} columns · {totalCards} cards</span>
            <div className="relative">
              <button onClick={() => setBoardMenu(p => !p)}
                className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50">
                <IconDotsVertical size={16} />
              </button>
              {boardMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBoardMenu(false)} />
                  <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                    <button onClick={() => { onDelete(); setBoardMenu(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50">
                      <IconTrash size={14} /> Delete board
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-5" style={{ minHeight: '100%', alignItems: 'flex-start' }}>
          {board.columns.map(col => (
            <ColumnComp key={col.id} column={col}
              isDropTarget={dropColId === col.id && dragInfo?.fromColId !== col.id}
              dragCardId={dragInfo?.cardId ?? null}
              onCardClick={c => setSelectedCard({ card: c, colId: col.id })}
              onAddCard={t => addCard(col.id, t)}
              onDeleteColumn={() => deleteColumn(col.id)}
              onRenameColumn={t => renameColumn(col.id, t)}
              onDragOver={e => { e.preventDefault(); setDropColId(col.id) }}
              onDrop={() => { if (dragInfo) moveCard(dragInfo.cardId, dragInfo.fromColId, col.id); setDragInfo(null); setDropColId(null) }}
              onCardDragStart={id => setDragInfo({ cardId: id, fromColId: col.id })}
              onCardDragEnd={() => { setDragInfo(null); setDropColId(null) }}
            />
          ))}

          {/* Add column */}
          <div className="w-64 shrink-0">
            {addingCol ? (
              <div className="rounded-2xl bg-gray-100 p-3">
                <input autoFocus value={newColTitle} onChange={e => setNewColTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newColTitle.trim()) { addColumn(newColTitle.trim()); setNewColTitle(''); setAddingCol(false) }
                    if (e.key === 'Escape') setAddingCol(false)
                  }}
                  placeholder="Column name…"
                  className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:border-[#6BA3D6]" />
                <div className="flex gap-2">
                  <button onClick={() => { if (newColTitle.trim()) { addColumn(newColTitle.trim()); setNewColTitle(''); setAddingCol(false) } }}
                    disabled={!newColTitle.trim()}
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    style={{ backgroundColor: ACCENT }}>
                    Add Column
                  </button>
                  <button onClick={() => setAddingCol(false)}
                    className="rounded-xl px-2 py-1.5 text-xs text-gray-400 hover:bg-white">
                    <IconX size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingCol(true)}
                className="flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-semibold text-gray-400 transition hover:border-[#6BA3D6] hover:text-[#6BA3D6]">
                <IconPlus size={16} /> Add column
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card detail panel */}
      {selectedCard && (
        <CardPanel card={selectedCard.card} colId={selectedCard.colId} board={board}
          onUpdate={patch => updateCard(selectedCard.colId, selectedCard.card.id, patch)}
          onMove={toColId => { moveCard(selectedCard.card.id, selectedCard.colId, toColId); setSelectedCard(null) }}
          onDelete={() => deleteCard(selectedCard.colId, selectedCard.card.id)}
          onClose={() => setSelectedCard(null)} />
      )}
    </div>
  )
}

// ─── New board modal ──────────────────────────────────────────────────────────

function NewBoardModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (b: KanbanBoard) => void
}) {
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [color, setColor]       = useState(ACCENT)

  function save() {
    if (!title.trim()) return
    const now = new Date().toISOString().split('T')[0]
    onSave({
      id: uid(), title: title.trim(), description: description.trim(), color, createdAt: now,
      columns: [
        { id: uid(), title: 'To Do',       color: '#f1f3f5', cards: [] },
        { id: uid(), title: 'In Progress', color: '#fef3c7', cards: [] },
        { id: uid(), title: 'Done',        color: '#dcfce7', cards: [] },
      ],
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">New Board</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><IconX size={18} /></button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className={LABEL_CLS}>Board Name *</label>
            <input type="text" autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Marketing & Outreach" className={INPUT} />
          </div>
          <div>
            <label className={LABEL_CLS}>Description</label>
            <textarea rows={2} value={description} onChange={e => setDesc(e.target.value)}
              placeholder="What is this board for?" className={INPUT + ' resize-none'} />
          </div>
          <div>
            <label className={LABEL_CLS}>Board Colour</label>
            <div className="flex gap-2 mt-1">
              {BOARD_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition hover:scale-110"
                  style={{ backgroundColor: c, outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }}>
                  {color === c && <IconCheck size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400">Starts with 3 default columns: To Do, In Progress, Done.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={!title.trim()}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: color }}>
            Create Board
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Board list card ──────────────────────────────────────────────────────────

function BoardCard({ board, onClick }: { board: KanbanBoard; onClick: () => void }) {
  const total = board.columns.reduce((s, c) => s + c.cards.length, 0)
  const doneCol = board.columns.find(c => ['done','achieved'].includes(c.title.toLowerCase()))
  const done = doneCol?.cards.length ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <button onClick={onClick}
      className="group w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="h-2" style={{ backgroundColor: board.color }} />
      <div className="p-5">
        <div className="mb-2 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: board.color }}>
            {board.title[0]}
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">{board.title}</h3>
            {board.description && <p className="text-xs text-gray-400 line-clamp-1">{board.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          {board.columns.map(c => (
            <span key={c.id} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COL_DOT[c.color] ?? '#9ca3af' }} />
              {c.cards.length}
            </span>
          ))}
          <span className="ml-auto">{total} cards</span>
        </div>

        {total > 0 && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-gray-400">
              <span>{done}/{total} done</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: board.color }} />
            </div>
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BoardsPage() {
  const [boards, setBoards]           = useState<KanbanBoard[]>(INIT_BOARDS)
  const [currentBoardId, setBoard]    = useState<string | null>(null)
  const [showNew, setShowNew]         = useState(false)

  const currentBoard = boards.find(b => b.id === currentBoardId) ?? null

  function updateBoard(updated: KanbanBoard) {
    setBoards(p => p.map(b => b.id === updated.id ? updated : b))
  }
  function deleteBoard(id: string) {
    setBoards(p => p.filter(b => b.id !== id))
    setBoard(null)
  }
  function addBoard(b: KanbanBoard) {
    setBoards(p => [...p, b])
    setShowNew(false)
    setBoard(b.id)
  }

  if (currentBoard) {
    return (
      <div className="flex h-screen flex-col overflow-hidden" style={{ backgroundColor: '#f4f6f9' }}>
        <BoardView board={currentBoard}
          onUpdate={updateBoard}
          onDelete={() => deleteBoard(currentBoard.id)}
          onBack={() => setBoard(null)} />
      </div>
    )
  }

  const totalCards = boards.reduce((s, b) => s + b.columns.reduce((cs, c) => cs + c.cards.length, 0), 0)
  const totalCols  = boards.reduce((s, b) => s + b.columns.length, 0)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f6f9' }}>
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Boards</h1>
            <p className="text-sm text-gray-500">Kanban boards for planning and task management</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: ACCENT }}>
            <IconPlus size={16} /> New Board
          </button>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Boards',       value: boards.length },
            { label: 'Total Cards',  value: totalCards },
            { label: 'Columns',      value: totalCols },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map(b => <BoardCard key={b.id} board={b} onClick={() => setBoard(b.id)} />)}
          <button onClick={() => setShowNew(true)}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 py-12 text-sm font-semibold text-gray-400 transition hover:border-[#6BA3D6] hover:text-[#6BA3D6]">
            <IconPlus size={24} className="mb-2" />
            New Board
          </button>
        </div>
      </div>

      {showNew && <NewBoardModal onClose={() => setShowNew(false)} onSave={addBoard} />}
    </div>
  )
}

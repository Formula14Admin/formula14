'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  IconSun, IconStar, IconStarFilled, IconCalendarEvent,
  IconListCheck, IconPlus, IconTrash, IconX, IconChevronDown,
  IconChevronRight, IconCircle, IconCircleCheckFilled, IconDots,
  IconNotes, IconCalendarDue, IconCheck,
} from '@tabler/icons-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Step {
  id: string
  title: string
  completed: boolean
}

interface Task {
  id: string
  title: string
  completed: boolean
  important: boolean
  myDay: boolean
  dueDate: string | null
  notes: string
  steps: Step[]
  listId: string
  createdAt: string
}

interface TaskList {
  id: string
  name: string
  color: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ACCENT = '#6BA3D6'

const LIST_COLORS = [
  '#6BA3D6', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#ef4444', '#06b6d4', '#84cc16',
]

const SMART_LISTS = [
  { id: 'my-day',    label: 'My Day',    color: '#f59e0b' },
  { id: 'important', label: 'Important', color: '#ef4444' },
  { id: 'planned',   label: 'Planned',   color: '#6BA3D6' },
]

function uid() { return Math.random().toString(36).slice(2, 10) }

// ─── localStorage helpers ──────────────────────────────────────────────────────

const TASKS_KEY = 'f14_todo_tasks'
const LISTS_KEY = 'f14_todo_lists'
const FLUSH_KEY = 'f14_todo_flushed_v2'

function loadTasks(): Task[] {
  if (typeof window === 'undefined') return []
  // One-time migration: clear any seed data written by old code versions
  if (!localStorage.getItem(FLUSH_KEY)) {
    localStorage.removeItem(TASKS_KEY)
    localStorage.removeItem(LISTS_KEY)
    localStorage.setItem(FLUSH_KEY, '1')
  }
  try { const s = localStorage.getItem(TASKS_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
}
function loadLists(): TaskList[] {
  if (typeof window === 'undefined') return []
  try { const s = localStorage.getItem(LISTS_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1)
  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function isOverdue(iso: string | null) {
  if (!iso) return false
  const d = new Date(iso + 'T00:00:00')
  const today = new Date(); today.setHours(0,0,0,0)
  return d < today
}

// ─── Smart list icon ───────────────────────────────────────────────────────────

function SmartIcon({ id, size = 18 }: { id: string; size?: number }) {
  if (id === 'my-day')    return <IconSun size={size} />
  if (id === 'important') return <IconStar size={size} />
  if (id === 'planned')   return <IconCalendarEvent size={size} />
  return <IconListCheck size={size} />
}

// ─── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({
  task, selected, onSelect, onToggleComplete, onToggleImportant,
}: {
  task: Task
  selected: boolean
  onSelect: () => void
  onToggleComplete: () => void
  onToggleImportant: () => void
}) {
  const overdue = isOverdue(task.dueDate) && !task.completed

  return (
    <div
      onClick={onSelect}
      className={`group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        selected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      {/* Completion circle */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggleComplete() }}
        className="shrink-0 text-gray-300 transition-colors hover:text-[#10b981]"
        title={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed
          ? <IconCircleCheckFilled size={20} style={{ color: '#10b981' }} />
          : <IconCircle size={20} />
        }
      </button>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-snug ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {task.title}
        </p>
        {/* Sub-line: due date, steps */}
        {(task.dueDate || task.steps.length > 0 || task.notes) && !task.completed && (
          <div className="mt-0.5 flex items-center gap-2">
            {task.dueDate && (
              <span className={`text-[11px] ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                {fmtDate(task.dueDate)}
              </span>
            )}
            {task.steps.length > 0 && (
              <span className="text-[11px] text-gray-400">
                {task.steps.filter(s => s.completed).length}/{task.steps.length} steps
              </span>
            )}
            {task.notes && (
              <IconNotes size={11} className="text-gray-300" />
            )}
          </div>
        )}
      </div>

      {/* Star */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggleImportant() }}
        className={`shrink-0 transition-colors ${
          task.important
            ? 'text-[#f59e0b]'
            : 'text-gray-200 opacity-0 group-hover:opacity-100 hover:text-[#f59e0b]'
        }`}
        title={task.important ? 'Remove importance' : 'Mark as important'}
      >
        {task.important
          ? <IconStarFilled size={16} />
          : <IconStar size={16} />
        }
      </button>
    </div>
  )
}

// ─── Add Task Bar ──────────────────────────────────────────────────────────────

function AddTaskBar({ onAdd, activeListId, listColor }: {
  onAdd: (title: string, important: boolean) => void
  activeListId: string
  listColor: string
}) {
  const [active, setActive] = useState(false)
  const [title, setTitle]   = useState('')
  const [important, setImportant] = useState(activeListId === 'important')
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset important flag when entering from Important list
  useEffect(() => { setImportant(activeListId === 'important') }, [activeListId])

  function activate() { setActive(true); setTimeout(() => inputRef.current?.focus(), 50) }

  function handleSubmit() {
    if (!title.trim()) { setActive(false); return }
    onAdd(title.trim(), important)
    setTitle('')
    setImportant(activeListId === 'important')
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') { setActive(false); setTitle('') }
  }

  if (!active) {
    return (
      <button
        onClick={activate}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
      >
        <IconPlus size={18} style={{ color: listColor }} />
        Add a task
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 px-3 py-3">
        <IconCircle size={20} className="shrink-0 text-gray-300" />
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Task name"
          className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
          autoFocus
        />
        <button
          type="button"
          onClick={() => setImportant(v => !v)}
          className="shrink-0 transition-colors"
          title="Mark as important"
        >
          {important
            ? <IconStarFilled size={16} style={{ color: '#f59e0b' }} />
            : <IconStar size={16} className="text-gray-300 hover:text-yellow-400" />
          }
        </button>
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>Press Enter to add</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setActive(false); setTitle('') }}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="rounded-md px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: listColor }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────

function DetailPanel({ task, lists, onClose, onUpdate, onDelete }: {
  task: Task
  lists: TaskList[]
  onClose: () => void
  onUpdate: (updated: Task) => void
  onDelete: (id: string) => void
}) {
  const [newStep, setNewStep]   = useState('')
  const stepInputRef = useRef<HTMLInputElement>(null)
  const list = lists.find(l => l.id === task.listId)

  function update(partial: Partial<Task>) { onUpdate({ ...task, ...partial }) }

  function addStep() {
    if (!newStep.trim()) return
    update({ steps: [...task.steps, { id: uid(), title: newStep.trim(), completed: false }] })
    setNewStep('')
    stepInputRef.current?.focus()
  }

  function updateStep(stepId: string, partial: Partial<Step>) {
    update({ steps: task.steps.map(s => s.id === stepId ? { ...s, ...partial } : s) })
  }

  function deleteStep(stepId: string) {
    update({ steps: task.steps.filter(s => s.id !== stepId) })
  }

  const createdDate = new Date(task.createdAt).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l border-gray-200 bg-white">

      {/* Title section */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => update({ completed: !task.completed })}
            className="mt-0.5 shrink-0 transition-colors hover:text-green-500"
          >
            {task.completed
              ? <IconCircleCheckFilled size={22} style={{ color: '#10b981' }} />
              : <IconCircle size={22} className="text-gray-300" />
            }
          </button>
          <textarea
            className={`flex-1 resize-none bg-transparent text-base font-semibold leading-snug outline-none ${
              task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
            value={task.title}
            onChange={e => update({ title: e.target.value })}
            rows={2}
          />
          <button
            onClick={() => update({ important: !task.important })}
            className="mt-0.5 shrink-0 transition-colors"
          >
            {task.important
              ? <IconStarFilled size={18} style={{ color: '#f59e0b' }} />
              : <IconStar size={18} className="text-gray-300 hover:text-yellow-400" />
            }
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Steps */}
        <div className="border-b border-gray-100 p-4">
          <div className="space-y-1">
            {task.steps.map(step => (
              <div key={step.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                <button onClick={() => updateStep(step.id, { completed: !step.completed })} className="shrink-0">
                  {step.completed
                    ? <IconCircleCheckFilled size={16} style={{ color: '#10b981' }} />
                    : <IconCircle size={16} className="text-gray-300" />
                  }
                </button>
                <span className={`flex-1 text-sm ${step.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                  {step.title}
                </span>
                <button
                  onClick={() => deleteStep(step.id)}
                  className="opacity-0 text-gray-300 hover:text-red-400 group-hover:opacity-100 transition-opacity"
                >
                  <IconX size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add step input */}
          <div className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <IconPlus size={16} className="shrink-0 text-gray-300" />
            <input
              ref={stepInputRef}
              type="text"
              value={newStep}
              onChange={e => setNewStep(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addStep(); if (e.key === 'Escape') setNewStep('') }}
              placeholder="Add step"
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Add to My Day */}
        <div className="border-b border-gray-100 p-2">
          <button
            onClick={() => update({ myDay: !task.myDay })}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              task.myDay
                ? 'bg-amber-50 text-amber-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <IconSun size={18} style={{ color: task.myDay ? '#f59e0b' : '#9ca3af' }} />
            {task.myDay ? 'Added to My Day' : 'Add to My Day'}
          </button>
        </div>

        {/* Due date */}
        <div className="border-b border-gray-100 p-2">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <IconCalendarEvent size={18} className={task.dueDate ? 'text-[#6BA3D6]' : 'text-gray-400'} />
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500">Due date</p>
              <input
                type="date"
                value={task.dueDate ?? ''}
                onChange={e => update({ dueDate: e.target.value || null })}
                className="mt-0.5 text-sm text-gray-700 outline-none bg-transparent"
              />
            </div>
            {task.dueDate && (
              <button
                onClick={() => update({ dueDate: null })}
                className="text-gray-300 hover:text-gray-500 transition-colors"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
        </div>

        {/* List indicator */}
        <div className="border-b border-gray-100 p-2">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: list?.color ?? ACCENT }}
            />
            <span className="text-sm text-gray-500">{list?.name ?? 'Tasks'}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="p-4">
          <div className="flex items-start gap-2.5">
            <IconNotes size={16} className="mt-2 shrink-0 text-gray-300" />
            <textarea
              className="flex-1 resize-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              value={task.notes}
              onChange={e => update({ notes: e.target.value })}
              placeholder="Add notes"
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Close"
        >
          <IconX size={18} />
        </button>
        <span className="text-[11px] text-gray-400">Created {createdDate}</span>
        <button
          onClick={() => onDelete(task.id)}
          className="text-gray-300 hover:text-red-400 transition-colors"
          title="Delete task"
        >
          <IconTrash size={18} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TodoPage() {
  const [tasks,        setTasks]        = useState<Task[]>([])
  const [lists,        setLists]        = useState<TaskList[]>([])
  const [activeListId, setActiveListId] = useState<string>('my-day')
  const [selectedId,   setSelectedId]   = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [newListName,  setNewListName]  = useState('')
  const [addingList,   setAddingList]   = useState(false)
  const newListRef = useRef<HTMLInputElement>(null)

  // Load from localStorage
  useEffect(() => {
    setTasks(loadTasks())
    setLists(loadLists())
  }, [])

  // Persist to localStorage
  useEffect(() => {
    if (tasks.length > 0) localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  }, [tasks])
  useEffect(() => {
    if (lists.length > 0) localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
  }, [lists])

  // ── Derived data ───────────────────────────────────────────────────────────

  const { activeTasks, completedTasks, listColor, listLabel } = useMemo(() => {
    let filtered = tasks
    if (activeListId === 'my-day')    filtered = tasks.filter(t => t.myDay)
    else if (activeListId === 'important') filtered = tasks.filter(t => t.important)
    else if (activeListId === 'planned')   filtered = tasks.filter(t => t.dueDate !== null)
    else filtered = tasks.filter(t => t.listId === activeListId)

    const smart = SMART_LISTS.find(s => s.id === activeListId)
    const list  = lists.find(l => l.id === activeListId)
    const color = smart?.color ?? list?.color ?? ACCENT
    const label = smart?.label ?? list?.name ?? 'Tasks'

    return {
      activeTasks:    filtered.filter(t => !t.completed),
      completedTasks: filtered.filter(t => t.completed),
      listColor: color,
      listLabel: label,
    }
  }, [tasks, lists, activeListId])

  const selectedTask = tasks.find(t => t.id === selectedId) ?? null

  // ── Task counts for sidebar badges ─────────────────────────────────────────

  const badgeCount = useCallback((id: string) => {
    if (id === 'my-day')    return tasks.filter(t => t.myDay && !t.completed).length
    if (id === 'important') return tasks.filter(t => t.important && !t.completed).length
    if (id === 'planned')   return tasks.filter(t => t.dueDate !== null && !t.completed).length
    return tasks.filter(t => t.listId === id && !t.completed).length
  }, [tasks])

  // ── Mutations ──────────────────────────────────────────────────────────────

  function updateTask(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  function toggleComplete(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
    // Close detail if completing the selected task
    if (id === selectedId) setSelectedId(null)
  }

  function toggleImportant(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, important: !t.important } : t))
  }

  function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelectedId(null)
  }

  function addTask(title: string, important: boolean) {
    // Determine which list to add to
    let listId = activeListId
    if (['my-day', 'important', 'planned'].includes(activeListId)) listId = 'tasks'

    const task: Task = {
      id: uid(), title, completed: false, important,
      myDay: activeListId === 'my-day',
      dueDate: null, notes: '', steps: [], listId,
      createdAt: new Date().toISOString(),
    }
    setTasks(prev => [task, ...prev])
  }

  function addList() {
    if (!newListName.trim()) { setAddingList(false); return }
    const color = LIST_COLORS[lists.length % LIST_COLORS.length]
    const newList: TaskList = { id: uid(), name: newListName.trim(), color }
    setLists(prev => [...prev, newList])
    setNewListName('')
    setAddingList(false)
    setActiveListId(newList.id)
  }

  function deleteList(id: string) {
    // Remove list and its tasks
    setLists(prev => prev.filter(l => l.id !== id))
    setTasks(prev => prev.filter(t => t.listId !== id))
    if (activeListId === id) setActiveListId('my-day')
    if (selectedTask?.listId === id) setSelectedId(null)
  }

  // ── Today label for My Day header ──────────────────────────────────────────

  const todayLabel = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  // ── Sidebar item ───────────────────────────────────────────────────────────

  function SidebarItem({ id, label, color, icon: Icon, count }: {
    id: string; label: string; color: string
    icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>
    count: number
  }) {
    const active = activeListId === id
    return (
      <button
        type="button"
        onClick={() => { setActiveListId(id); setSelectedId(null) }}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
          active ? 'bg-[#6BA3D6]/10 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <Icon size={18} style={{ color: active ? color : '#9ca3af' }} />
        <span className="flex-1 truncate">{label}</span>
        {count > 0 && (
          <span className={`text-xs font-semibold ${active ? 'text-gray-600' : 'text-gray-400'}`}>{count}</span>
        )}
      </button>
    )
  }

  // ── Custom list sidebar item ────────────────────────────────────────────────

  function ListSidebarItem({ list }: { list: TaskList }) {
    const active = activeListId === list.id
    const count  = badgeCount(list.id)
    const isDefault = list.id === 'tasks'

    return (
      <div className="group relative">
        <button
          type="button"
          onClick={() => { setActiveListId(list.id); setSelectedId(null) }}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
            active ? 'bg-[#6BA3D6]/10 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          {isDefault
            ? <IconListCheck size={18} style={{ color: active ? list.color : '#9ca3af' }} />
            : <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: active ? list.color : '#d1d5db' }} />
          }
          <span className="flex-1 truncate">{list.name}</span>
          {count > 0 && (
            <span className={`text-xs font-semibold ${active ? 'text-gray-600' : 'text-gray-400'}`}>{count}</span>
          )}
        </button>
        {!isDefault && (
          <button
            onClick={e => { e.stopPropagation(); deleteList(list.id) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-0 text-gray-400 hover:text-red-400 transition-opacity group-hover:opacity-100"
          >
            <IconX size={13} />
          </button>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-white">

      {/* ── Left Sidebar ────────────────────────────────────────────────────── */}
      <div className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-gray-200" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="p-3 pt-4 space-y-0.5">

          {/* Smart lists */}
          <SidebarItem id="my-day"    label="My Day"    color="#f59e0b" icon={IconSun}           count={badgeCount('my-day')} />
          <SidebarItem id="important" label="Important" color="#ef4444" icon={IconStarFilled}    count={badgeCount('important')} />
          <SidebarItem id="planned"   label="Planned"   color={ACCENT}  icon={IconCalendarEvent} count={badgeCount('planned')} />
        </div>

        <div className="mx-3 my-1 border-t border-gray-200" />

        {/* Task lists */}
        <div className="p-3 space-y-0.5">
          {lists.map(list => <ListSidebarItem key={list.id} list={list} />)}
        </div>

        <div className="mx-3 my-1 border-t border-gray-200" />

        {/* New list */}
        <div className="p-3">
          {addingList ? (
            <div className="flex items-center gap-2">
              <input
                ref={newListRef}
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addList(); if (e.key === 'Escape') { setAddingList(false); setNewListName('') } }}
                placeholder="List name"
                className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#6BA3D6]"
                autoFocus
              />
              <button onClick={addList} className="rounded-lg p-1.5 text-white" style={{ backgroundColor: ACCENT }}>
                <IconCheck size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingList(true)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <IconPlus size={16} />
              New list
            </button>
          )}
        </div>
      </div>

      {/* ── Main Task List ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-4 pb-3 pt-4 md:px-6 md:pt-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900" style={{ color: listColor }}>
                {listLabel}
              </h1>
              {activeListId === 'my-day' && (
                <p className="mt-0.5 text-xs font-medium text-gray-400">{todayLabel}</p>
              )}
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">

          {/* Active tasks */}
          {activeTasks.length === 0 && completedTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: listColor + '1a' }}
              >
                <SmartIcon id={activeListId} size={28} />
              </div>
              <p className="text-sm font-medium text-gray-500">
                {activeListId === 'my-day'
                  ? 'Your day is clear — add tasks to focus on today'
                  : activeListId === 'important'
                  ? 'Star tasks to mark them as important'
                  : activeListId === 'planned'
                  ? 'Tasks with due dates will appear here'
                  : 'No tasks yet — add one below'}
              </p>
            </div>
          )}

          <div className="space-y-0.5">
            {activeTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                selected={selectedId === task.id}
                onSelect={() => setSelectedId(selectedId === task.id ? null : task.id)}
                onToggleComplete={() => toggleComplete(task.id)}
                onToggleImportant={() => toggleImportant(task.id)}
              />
            ))}
          </div>

          {/* Completed section */}
          {completedTasks.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowCompleted(v => !v)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
              >
                {showCompleted ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                Completed
                <span className="text-xs text-gray-400">({completedTasks.length})</span>
              </button>

              {showCompleted && (
                <div className="mt-1 space-y-0.5 opacity-70">
                  {completedTasks.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      selected={selectedId === task.id}
                      onSelect={() => setSelectedId(selectedId === task.id ? null : task.id)}
                      onToggleComplete={() => toggleComplete(task.id)}
                      onToggleImportant={() => toggleImportant(task.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add task bar — only show for non-planned smart lists */}
          {activeListId !== 'planned' && (
            <div className="mt-4">
              <AddTaskBar
                onAdd={addTask}
                activeListId={activeListId}
                listColor={listColor}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Panel ────────────────────────────────────────────────────── */}
      {selectedTask && (
        <DetailPanel
          task={selectedTask}
          lists={lists}
          onClose={() => setSelectedId(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  )
}

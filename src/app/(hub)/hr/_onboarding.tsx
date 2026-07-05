'use client'

import { useState } from 'react'
import { IconChevronDown, IconCheck } from '@tabler/icons-react'
import { StaffMember, fmtDate, ACCENT } from '../team/_shared'
import { ONBOARDING_TASKS, TODAY_ISO, loadOnboarding, saveOnboarding, daysBetween } from './_shared'
import { Avatar, Badge } from './_ui'

export function OnboardingTab({ staff }: { staff: StaffMember[] }) {
  const [onboarding, setOnboarding] = useState<Record<string, string[]>>(loadOnboarding)
  const [expandedStaff, setExpandedStaff] = useState<string | null>(staff[0]?.id ?? null)

  function toggle(staffId: string, taskId: string) {
    const completed = onboarding[staffId] ?? []
    const next = completed.includes(taskId) ? completed.filter(t => t !== taskId) : [...completed, taskId]
    const updated = { ...onboarding, [staffId]: next }
    setOnboarding(updated)
    saveOnboarding(updated)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {staff.map(s => {
        const completed = onboarding[s.id] ?? []
        const pct = Math.round((completed.length / ONBOARDING_TASKS.length) * 100)
        const isExpanded = expandedStaff === s.id
        const startDaysAgo = daysBetween(s.startDate, TODAY_ISO)

        return (
          <div key={s.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <button type="button" onClick={() => setExpandedStaff(isExpanded ? null : s.id)}
              className="flex w-full items-center gap-4 p-5 text-left hover:bg-gray-50 transition">
              <Avatar firstName={s.firstName} lastName={s.lastName} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900">{s.firstName} {s.lastName}</p>
                  {pct === 100 && <Badge label="Complete" color="#15803d" bg="#dcfce7" />}
                  {pct < 100 && startDaysAgo > 30 && <Badge label="Overdue" color="#b91c1c" bg="#fee2e2" />}
                </div>
                <p className="text-xs text-gray-500">{s.role} · Started {fmtDate(s.startDate)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#10b981' : ACCENT }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{completed.length}/{ONBOARDING_TASKS.length}</span>
                </div>
              </div>
              <IconChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 px-5 pb-5">
                {['Tax & Banking', 'Compliance', 'Training', 'System Access', 'Orientation'].map(cat => {
                  const tasks = ONBOARDING_TASKS.filter(t => t.category === cat)
                  return (
                    <div key={cat} className="mt-4">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-gray-400">{cat}</p>
                      <div className="space-y-1.5">
                        {tasks.map(task => {
                          const done = completed.includes(task.id)
                          const overdue = !done && startDaysAgo > task.dueDays
                          return (
                            <button key={task.id} type="button" onClick={() => toggle(s.id, task.id)}
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-gray-50">
                              <div className={`flex shrink-0 items-center justify-center rounded border-2 transition ${done ? 'border-[#6BA3D6] bg-[#6BA3D6]' : overdue ? 'border-red-400' : 'border-gray-300'}`}
                                style={{ width: 18, height: 18 }}>
                                {done && <IconCheck size={11} className="text-white" strokeWidth={3} />}
                              </div>
                              <span className={`text-sm ${done ? 'text-gray-400 line-through' : overdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>{task.label}</span>
                              {overdue && !done && <span className="ml-auto text-[10px] font-bold text-red-500">Overdue</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

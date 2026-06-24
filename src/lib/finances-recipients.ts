export interface Recipient {
  id: string
  name: string
  email: string
  role: string
}

export const DEFAULT_RECIPIENTS: Recipient[] = [
  { id: 'r1', name: 'Accountant', email: 'accountant@formula14.com.au', role: 'Accountant' },
  { id: 'r2', name: 'Matt',       email: 'matt@formula14.com.au',        role: 'Head Coach' },
  { id: 'r3', name: 'Jade',       email: 'jade@formula14.com.au',        role: 'Coach'      },
  { id: 'r4', name: 'Admin',      email: 'admin@formula14.com.au',       role: 'Admin'      },
]

const KEY = 'f14_summary_recipients'

export function loadRecipients(): Recipient[] {
  if (typeof window === 'undefined') return DEFAULT_RECIPIENTS
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? (JSON.parse(stored) as Recipient[]) : DEFAULT_RECIPIENTS
  } catch {
    return DEFAULT_RECIPIENTS
  }
}

export function saveRecipients(recs: Recipient[]): void {
  localStorage.setItem(KEY, JSON.stringify(recs))
}

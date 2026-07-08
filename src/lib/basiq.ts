// Basiq v3 Australian Open Banking client — server-side only
// API key is already a base64-encoded client_id:client_secret — use directly.

const BASE = 'https://au-api.basiq.io'
const CONN_ID = '00000000-0000-0000-0000-000000000001'

export { CONN_ID as BASIQ_ROW_ID }

// Token cache — reuse within the same process (Vercel function lifetime)
let cachedToken: { value: string; expiresAt: number } | null = null

export async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.value
  }

  const key = process.env.BASIQ_API_KEY
  if (!key) throw new Error('BASIQ_API_KEY not set')

  const res = await fetch(`${BASE}/token`, {
    method: 'POST',
    headers: {
      // Key is already base64(client_id:client_secret) — do NOT re-encode
      Authorization:  `Basic ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'basiq-version': '3.0',
    },
    body: 'grant_type=client_credentials&scope=SERVER_ACCESS',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Basiq token error ${res.status}: ${err}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return data.access_token
}

async function basiqGet(path: string) {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'basiq-version': '3.0' },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Basiq GET ${path} ${res.status}: ${err}`)
  }
  return res.json()
}

async function basiqPost(path: string, body: object) {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization:   `Bearer ${token}`,
      'Content-Type':  'application/json',
      'basiq-version': '3.0',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Basiq POST ${path} ${res.status}: ${err}`)
  }
  return res.json()
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export async function createBasiqUser(email: string): Promise<string> {
  const data = await basiqPost('/users', { email }) as { id: string }
  return data.id
}

// ─── Auth link ─────────────────────────────────────────────────────────────────

export async function createAuthLink(basiqUserId: string, redirectUrl: string): Promise<string> {
  const data = await basiqPost(`/users/${basiqUserId}/auth_link`, {}) as { links: { public: string } }
  const url = new URL(data.links.public)
  url.searchParams.set('redirect_url', redirectUrl)
  return url.toString()
}

// ─── Accounts ──────────────────────────────────────────────────────────────────

export interface BasiqAccount {
  id:              string
  name:            string
  accountNo:       string
  bsb:             string
  balance:         string   // decimal string e.g. "1234.56"
  availableFunds:  string
  currency:        string
  institution: {
    shortName: string
    name:      string
  }
  class?: {
    product?: string
  }
}

export async function getAccounts(basiqUserId: string): Promise<BasiqAccount[]> {
  try {
    const data = await basiqGet(`/users/${basiqUserId}/accounts`) as { data: BasiqAccount[] }
    return data.data ?? []
  } catch {
    return []
  }
}

// ─── Transactions ───────────────────────────────────────────────────────────────

export interface BasiqTransaction {
  id:          string
  postDate:    string   // YYYY-MM-DD
  description: string
  amount:      string   // negative = debit/expense, positive = credit/income
  type:        string   // 'debit' | 'credit'
  account:     string
  category?:    string
  subCategory?: string
}

export async function getTransactions(
  basiqUserId: string,
  fromDate: string,     // YYYY-MM-DD
): Promise<BasiqTransaction[]> {
  try {
    const params = new URLSearchParams({
      filter: `transaction.postDate.gteq('${fromDate}')`,
      limit:  '500',
    })
    const data = await basiqGet(`/users/${basiqUserId}/transactions?${params}`) as { data: BasiqTransaction[] }
    return data.data ?? []
  } catch {
    return []
  }
}

// ─── Jobs (poll connection status) ─────────────────────────────────────────────

export async function getJob(jobId: string): Promise<{ status: string; steps: { status: string }[] }> {
  return basiqGet(`/jobs/${jobId}`) as Promise<{ status: string; steps: { status: string }[] }>
}

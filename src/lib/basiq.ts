// Basiq v3 Australian Open Banking client — server-side only

const BASE = 'https://au-api.basiq.io'
const CONN_ID = '00000000-0000-0000-0000-000000000001'

export { CONN_ID as BASIQ_ROW_ID }

async function getToken(): Promise<string> {
  const key = process.env.BASIQ_API_KEY
  if (!key) throw new Error('BASIQ_API_KEY not set')

  const res = await fetch(`${BASE}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'basiq-version': '3.0',
    },
    body: 'grant_type=client_credentials&scope=SERVER_ACCESS',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Basiq token error ${res.status}: ${err}`)
  }

  const data = await res.json() as { access_token: string }
  return data.access_token
}

export async function createBasiqUser(email: string): Promise<string> {
  const token = await getToken()
  const res = await fetch(`${BASE}/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'basiq-version': '3.0',
    },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error(`Basiq create user ${res.status}: ${await res.text()}`)
  const data = await res.json() as { id: string }
  return data.id
}

export async function createAuthLink(basiqUserId: string, redirectUrl: string): Promise<string> {
  const token = await getToken()
  const res = await fetch(`${BASE}/users/${basiqUserId}/auth_link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'basiq-version': '3.0',
    },
    body: JSON.stringify({ mobile: '' }),
  })

  if (!res.ok) throw new Error(`Basiq auth link ${res.status}: ${await res.text()}`)

  const data = await res.json() as { links: { public: string }; id?: string }
  const url = new URL(data.links.public)
  url.searchParams.set('redirect_url', redirectUrl)
  return url.toString()
}

export interface BasiqAccount {
  id: string
  name: string
  accountNo: string
  bsb: string
  institution: { shortName: string }
}

export async function getAccounts(basiqUserId: string): Promise<BasiqAccount[]> {
  const token = await getToken()
  const res = await fetch(`${BASE}/users/${basiqUserId}/accounts`, {
    headers: { Authorization: `Bearer ${token}`, 'basiq-version': '3.0' },
  })
  if (!res.ok) return []
  const data = await res.json() as { data: BasiqAccount[] }
  return data.data ?? []
}

export interface BasiqTransaction {
  id: string
  postDate: string        // YYYY-MM-DD
  description: string
  amount: string          // negative = debit
  type: string            // 'debit' | 'credit'
  account: string         // account ID
  category?: string
  subCategory?: string
}

export async function getTransactions(
  basiqUserId: string,
  fromDate: string,       // ISO date YYYY-MM-DD
): Promise<BasiqTransaction[]> {
  const token = await getToken()
  const params = new URLSearchParams({
    'filter': `transaction.postDate.gt('${fromDate}')`,
    'limit': '500',
  })

  const res = await fetch(`${BASE}/users/${basiqUserId}/transactions?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'basiq-version': '3.0' },
  })
  if (!res.ok) return []
  const data = await res.json() as { data: BasiqTransaction[] }
  return data.data ?? []
}

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not configured. Add it to .env.local and restart the server.' },
      { status: 503 }
    )
  }

  const { messages, financialContext } = await req.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[]
    financialContext: string
  }

  if (!messages?.length) {
    return Response.json({ error: 'Messages are required.' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })

  const system = `You are a smart financial assistant embedded in Formula14's Operations Hub — a basketball training academy based in Melbourne, Australia. You have access to the business's real-time financial data and can help the owner analyse performance, spot trends, and make better financial decisions.

${financialContext}

Guidelines:
- Be specific and reference actual numbers from the data when relevant
- Use Australian English spelling and currency (AUD)
- Keep responses focused and actionable — the owner is busy
- Flag concerns clearly (e.g. expense blowouts, cashflow gaps, overdue invoices)
- When asked about projections, be clear that they are estimates
- You can see both business and personal finance data when provided
- Format your responses clearly — use bullet points or short paragraphs as appropriate
- Do not provide formal financial or legal advice; recommend consulting a professional for major decisions`

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(enc.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

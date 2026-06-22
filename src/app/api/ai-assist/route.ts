import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const SYSTEM_PROMPTS: Record<string, string> = {
  policy: `You are an expert at writing clear, professional organisational policies for sports academies and training facilities. Help the user write comprehensive, well-structured policies.

A policy typically includes: Purpose, Scope, Policy Statement, Guidelines or Rules, Responsibilities, and Review Date. Write in a professional, concise style. Use Australian English spelling.`,

  procedure: `You are an expert at writing clear, step-by-step procedures for sports academies and training facilities. Help the user write actionable procedures that staff and athletes can easily follow.

A procedure typically includes: Purpose, Scope, any required materials or prerequisites, numbered step-by-step instructions, expected outcomes, and any warnings or notes. Write in plain language. Use Australian English spelling.`,
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.' },
      { status: 503 }
    )
  }

  const { prompt, docType, existingContent } = await req.json() as {
    prompt: string
    docType: 'policy' | 'procedure'
    existingContent?: string
  }

  if (!prompt?.trim()) {
    return Response.json({ error: 'Prompt is required.' }, { status: 400 })
  }

  const client = new Anthropic({ apiKey })
  const system = SYSTEM_PROMPTS[docType] ?? SYSTEM_PROMPTS.policy

  const userMessage = existingContent?.trim()
    ? `Current document content:\n\n${existingContent}\n\n---\n\nRequest: ${prompt}`
    : prompt

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
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

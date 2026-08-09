import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

function hashIdentifier(scope: string, identifier: string): string {
  const secret = process.env.RATE_LIMIT_SECRET
  if (!secret || secret.length < 32) throw new Error('RATE_LIMIT_SECRET must be at least 32 characters')

  return createHmac('sha256', secret)
    .update(`${scope}:${identifier}`)
    .digest('hex')
}

export async function consumeRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('consume_rate_limit', {
    p_identifier_hash: hashIdentifier(scope, identifier),
    p_limit_count: limit,
    p_window_seconds: windowSeconds,
  })

  if (error) throw error
  return data === true
}

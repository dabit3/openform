import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Number of proxies we sit behind that append to X-Forwarded-For. The client
// controls the LEFT of that chain; only the rightmost-Nth hop is written by our
// own trusted edge. Default 1 matches a single reverse proxy / Vercel.
const TRUSTED_PROXY_HOPS = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1))

// ponytail: fail closed to 'unknown' when no trusted IP is present — better to
// share one bucket than to let a spoofed header mint unlimited buckets.
export function getClientIp(request: NextRequest): string {
  // Vercel sets this from the verified connection; never client-forgeable.
  const platform = request.headers.get('x-vercel-forwarded-for')?.trim()
  if (platform && isIP(platform)) return platform

  const chain = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
  const candidate = chain[chain.length - TRUSTED_PROXY_HOPS]
    ?? request.headers.get('x-real-ip')?.trim()
    ?? ''
  return isIP(candidate) ? candidate : 'unknown'
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

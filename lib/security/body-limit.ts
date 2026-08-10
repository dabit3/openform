import { NextRequest } from 'next/server'

// Enforce a byte cap while streaming, so an oversized (or Content-Length-less,
// chunked) request is aborted instead of being fully buffered into heap first.
// Content-Length is client-controlled and optional (HTTP/2, Transfer-Encoding:
// chunked), so it can never be the real guard.

export async function readBoundedText(
  request: NextRequest,
  maxBytes: number
): Promise<string | null> {
  const reader = request.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

// Returns a Request whose body stream errors out past maxBytes, so a downstream
// `.formData()` rejects instead of buffering an unbounded multipart body.
export function cappedRequest(request: NextRequest, maxBytes: number): Request {
  if (!request.body) throw new Error('Missing body')
  let seen = 0
  const capped = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength
        if (seen > maxBytes) {
          controller.error(new Error('PAYLOAD_TOO_LARGE'))
          return
        }
        controller.enqueue(chunk)
      },
    })
  )
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: capped,
    // @ts-expect-error undici streaming request requires duplex
    duplex: 'half',
  })
}

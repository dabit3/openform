import { createHmac, timingSafeEqual } from 'node:crypto'

interface UploadTokenPayload {
  formId: string
  questionId: string
  expiresAt: number
}

function getSecret(): string {
  const secret = process.env.UPLOAD_TOKEN_SECRET
  if (!secret || secret.length < 32) throw new Error('UPLOAD_TOKEN_SECRET must be at least 32 characters')
  return secret
}

function sign(encodedPayload: string): string {
  return createHmac('sha256', getSecret()).update(encodedPayload).digest('base64url')
}

export function createUploadToken(formId: string, questionId: string): string {
  const payload: UploadTokenPayload = {
    formId,
    questionId,
    expiresAt: Date.now() + 30 * 60 * 1000,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encodedPayload}.${sign(encodedPayload)}`
}

export function verifyUploadToken(token: string): UploadTokenPayload | null {
  const [encodedPayload, suppliedSignature] = token.split('.')
  if (!encodedPayload || !suppliedSignature) return null

  const expectedSignature = sign(encodedPayload)
  const supplied = Buffer.from(suppliedSignature)
  const expected = Buffer.from(expectedSignature)
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as UploadTokenPayload
    if (typeof payload.formId !== 'string'
      || typeof payload.questionId !== 'string'
      || typeof payload.expiresAt !== 'number'
      || payload.expiresAt < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

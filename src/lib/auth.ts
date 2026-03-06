import { timingSafeEqual } from 'crypto'

export function verifySecret(request: Request): boolean {
  const secret = process.env.DRIFTWATCH_ADMIN_SECRET
  if (!secret) return false
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token || token.length !== secret.length) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret))
}

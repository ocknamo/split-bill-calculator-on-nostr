/**
 * Settlement ID generation and validation via uuid v4
 */

export function generateSettlementId(): string {
  return crypto.randomUUID()
}

export function isValidSettlementId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false
  }
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidV4Regex.test(id)
}

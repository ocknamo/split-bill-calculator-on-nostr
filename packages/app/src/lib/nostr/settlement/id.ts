/**
 * Settlement ID generation and validation via uuid v4
 */

/**
 * Generates a new settlement ID using UUID v4 format
 * UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hex digit and y is one of 8, 9, a, or b
 */
export function generateSettlementId(): string {
	return crypto.randomUUID()
}

/**
 * Validates if a string is a valid settlement ID (UUID v4 format)
 * Rejects human-readable strings and non-UUID formats
 */
export function isValidSettlementId(id: string): boolean {
	if (!id || typeof id !== 'string') {
		return false
	}

	// UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
	// Version must be 4, variant must be 8, 9, a, or b
	const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

	return uuidV4Regex.test(id)
}

/**
 * Settlement protocol for Nostr-based collaborative expense splitting
 *
 * This module provides:
 * - Settlement ID generation and validation
 * - Capability-based access control (invite tokens)
 * - Event creation and parsing for all settlement event types
 * - State building from event collections
 */

// Capability (invite tokens)
export { calculateCap, calculateInviteHash, generateInviteToken, verifyCap } from './capability'
// Event creation and parsing
export {
  createExpenseEvent,
  createLockEvent,
  createMemberEvent,
  createSettlementEvent,
  parseExpenseEvent,
  parseLockEvent,
  parseMemberEvent,
  parseSettlementEvent,
  validateExpenseEvent,
  validateMemberEvent,
  validateSettlementEvent,
} from './events'

// Event types
export {
  EXPENSE_KIND,
  type ExpenseContent,
  type ExpenseEvent,
  LOCK_KIND,
  type LockContent,
  type LockEvent,
  MEMBER_KIND,
  type MemberContent,
  type MemberEvent,
  type MemberInfo,
  type NostrEvent,
  SETTLEMENT_KIND,
  type SettlementContent,
  type SettlementEvent,
  type UnsignedEvent,
} from './events/types'
// React Hooks
export {
  type ConnectionStatus,
  type CreateSettlementParams,
  type CreateSettlementResult,
  createSettlement,
  generateInviteLink,
  parseInviteLink,
  type UseInviteLinkOptions,
  type UseInviteLinkResult,
  type UseSettlementSyncOptions,
  type UseSettlementSyncResult,
  useInviteLink,
  useSettlementSync,
} from './hooks'
// ID generation
export { generateSettlementId, isValidSettlementId } from './id'

// Relay communication
export {
  createRelayClient,
  fetchSettlementEvents,
  type RelayClient,
  type RelayConfig,
  type Subscription,
  type SubscriptionOptions,
} from './relay'
// State building
export {
  buildSettlementState,
  type ExpenseData,
  type InvalidExpense,
  type SettlementState,
} from './state'

// Storage (Owner key management)
export {
  cleanupOldOwnerKeys,
  clearOwnerKey,
  getAllOwnerKeys,
  hasOwnerKey,
  loadOwnerKey,
  saveOwnerKey,
} from './storage'

/**
 * Settlement protocol for Nostr-based collaborative expense splitting
 *
 * This module provides:
 * - Settlement ID generation and validation
 * - Capability-based access control (invite tokens)
 * - Event creation and parsing for all settlement event types
 * - State building from event collections
 */

// ID generation
export { generateSettlementId, isValidSettlementId } from "./id"

// Capability (invite tokens)
export {
  generateInviteToken,
  calculateInviteHash,
  calculateCap,
  verifyCap,
} from "./capability"

// Event types
export {
  SETTLEMENT_KIND,
  MEMBER_KIND,
  EXPENSE_KIND,
  LOCK_KIND,
  type NostrEvent,
  type UnsignedEvent,
  type SettlementContent,
  type MemberContent,
  type MemberInfo,
  type ExpenseContent,
  type LockContent,
  type SettlementEvent,
  type MemberEvent,
  type ExpenseEvent,
  type LockEvent,
} from "./events/types"

// Event creation and parsing
export {
  createSettlementEvent,
  createMemberEvent,
  createExpenseEvent,
  createLockEvent,
  parseSettlementEvent,
  parseMemberEvent,
  parseExpenseEvent,
  parseLockEvent,
  validateSettlementEvent,
  validateMemberEvent,
  validateExpenseEvent,
} from "./events"

// State building
export {
  buildSettlementState,
  type SettlementState,
  type ExpenseData,
  type InvalidExpense,
} from "./state"

// Relay communication
export {
  createRelayClient,
  fetchSettlementEvents,
  type RelayConfig,
  type RelayClient,
  type SubscriptionOptions,
  type Subscription,
} from "./relay"

// React Hooks
export {
  parseInviteLink,
  generateInviteLink,
  useInviteLink,
  useSettlementSync,
  createSettlement,
  type CreateSettlementParams,
  type CreateSettlementResult,
  type UseInviteLinkOptions,
  type UseInviteLinkResult,
  type UseSettlementSyncOptions,
  type UseSettlementSyncResult,
  type ConnectionStatus,
} from "./hooks"

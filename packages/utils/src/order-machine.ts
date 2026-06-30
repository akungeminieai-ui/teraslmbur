import { OrderStatus, ORDER_TRANSITIONS } from '@teras-lmbur/types';

/**
 * Check if an order can transition from one status to another.
 * Enforces the defined state machine transitions.
 */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  const validTargets = ORDER_TRANSITIONS[from];
  return validTargets.includes(to);
}

/**
 * Get all valid next statuses from the current status.
 */
export function getNextStatuses(current: OrderStatus): OrderStatus[] {
  return ORDER_TRANSITIONS[current];
}

/**
 * Check if an order status is terminal (no further transitions possible).
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

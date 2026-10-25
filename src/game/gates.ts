import { GATE, SQUAD } from './tuning';
import type { Gate, GateSpec } from './types';

export const applyGate = (units: number, gate: GateSpec): number => {
  const next = gate.op === 'add' ? units + gate.value : Math.floor(units * gate.value);
  return Math.max(0, Math.min(SQUAD.maxUnits, next));
};

export const isBeneficial = (gate: GateSpec): boolean =>
  gate.op === 'add' ? gate.value >= 0 : gate.value >= 1;

export const gateLabel = (gate: GateSpec): string => {
  if (gate.op === 'mul') return `×${gate.value}`;
  return gate.value >= 0 ? `+${gate.value}` : `${gate.value}`;
};

/**
 * Shooting an additive gate raises its value. `amount` is measured in volleys,
 * so a bigger squad doesn't pump gates faster than a small one.
 * Multiplier gates are fixed. Returns true when the displayed value changed.
 */
export const chargeGate = (gate: Gate, amount: number): boolean => {
  if (gate.op === 'mul' || isMaxed(gate)) return false;

  gate.charge += amount / GATE.volleysPerPoint;
  let changed = false;
  while (gate.charge >= 1 && gate.value < GATE.maxValue && !isMaxed(gate)) {
    gate.charge -= 1;
    gate.value += 1;
    gate.raised += 1;
    changed = true;
  }
  if (isMaxed(gate)) gate.charge = 0;
  return changed;
};

/** True once a gate has been shot up as far as it can go. */
export const isMaxed = (gate: Gate): boolean => gate.raised >= GATE.maxRaise;

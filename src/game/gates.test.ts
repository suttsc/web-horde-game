import { describe, expect, it } from 'vitest';
import { applyGate, chargeGate, gateLabel, isBeneficial, isMaxed } from './gates';
import { GATE, SQUAD } from './tuning';
import type { Gate } from './types';

const gate = (op: Gate['op'], value: number): Gate => ({
  op,
  value,
  left: 0,
  right: 100,
  charge: 0,
  raised: 0,
  flash: 0,
});

describe('applyGate', () => {
  it('adds and subtracts units', () => {
    expect(applyGate(10, { op: 'add', value: 5 })).toBe(15);
    expect(applyGate(10, { op: 'add', value: -3 })).toBe(7);
  });

  it('multiplies and floors', () => {
    expect(applyGate(7, { op: 'mul', value: 2 })).toBe(14);
    expect(applyGate(5, { op: 'mul', value: 1.5 })).toBe(7);
  });

  it('clamps between zero and the max squad size', () => {
    expect(applyGate(2, { op: 'add', value: -10 })).toBe(0);
    expect(applyGate(SQUAD.maxUnits, { op: 'mul', value: 3 })).toBe(SQUAD.maxUnits);
  });
});

describe('gate presentation', () => {
  it('labels gates', () => {
    expect(gateLabel({ op: 'add', value: 4 })).toBe('+4');
    expect(gateLabel({ op: 'add', value: -2 })).toBe('-2');
    expect(gateLabel({ op: 'mul', value: 2 })).toBe('×2');
  });

  it('treats zero and above as beneficial', () => {
    expect(isBeneficial({ op: 'add', value: 0 })).toBe(true);
    expect(isBeneficial({ op: 'add', value: -1 })).toBe(false);
    expect(isBeneficial({ op: 'mul', value: 2 })).toBe(true);
  });
});

describe('chargeGate', () => {
  it('raises an additive gate one point per configured number of volleys', () => {
    const g = gate('add', -3);
    expect(chargeGate(g, GATE.volleysPerPoint / 2)).toBe(false);
    expect(chargeGate(g, GATE.volleysPerPoint / 2)).toBe(true);
    expect(g.value).toBe(-2);
  });

  it('can flip a negative gate positive', () => {
    const g = gate('add', -2);
    chargeGate(g, GATE.volleysPerPoint * 3);
    expect(g.value).toBe(1);
    expect(isBeneficial(g)).toBe(true);
  });

  it('never changes multiplier gates', () => {
    const g = gate('mul', 2);
    expect(chargeGate(g, 100)).toBe(false);
    expect(g.value).toBe(2);
  });

  it('caps at the max value', () => {
    const g = gate('add', GATE.maxValue - 1);
    chargeGate(g, GATE.volleysPerPoint * 10);
    expect(g.value).toBe(GATE.maxValue);
  });

  it('stops rising after the shooting cap', () => {
    const g = gate('add', 2);
    chargeGate(g, GATE.volleysPerPoint * 50);
    expect(g.value).toBe(2 + GATE.maxRaise);
    expect(isMaxed(g)).toBe(true);
    expect(chargeGate(g, GATE.volleysPerPoint * 5)).toBe(false);
  });
});

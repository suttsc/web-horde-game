import { describe, expect, it } from 'vitest';
import { contactDamage } from './Game';
import { ZOMBIE } from './tuning';

describe('contactDamage', () => {
  it('uses the kind minimum for weak zombies', () => {
    expect(contactDamage({ kind: 'walker', hp: 1, damage: 1 })).toBe(1);
    expect(contactDamage({ kind: 'bloater', hp: 1, damage: 4 })).toBe(4);
  });

  it('scales with remaining hp', () => {
    expect(contactDamage({ kind: 'walker', hp: ZOMBIE.hpPerSoldier * 3, damage: 1 })).toBe(3);
  });

  it('is capped so one zombie cannot wipe a squad', () => {
    expect(contactDamage({ kind: 'bloater', hp: 10_000, damage: 4 })).toBe(ZOMBIE.maxContactDamage);
  });

  it('keeps brutes at their flat damage since they come back for more', () => {
    expect(contactDamage({ kind: 'brute', hp: 10_000, damage: 6 })).toBe(6);
  });
});

import { describe, expect, it } from 'vitest';
import { PERKS, rollPerks, type PerkId } from './perks';
import { createRng } from './rng';

describe('rollPerks', () => {
  it('offers three distinct perks', () => {
    const picks = rollPerks({}, createRng(1));
    expect(picks).toHaveLength(3);
    expect(new Set(picks).size).toBe(3);
  });

  it('never offers a maxed perk', () => {
    const maxed = Object.fromEntries(
      (Object.keys(PERKS) as PerkId[])
        .filter((id) => id !== 'medic' && id !== 'reinforcements')
        .map((id) => [id, PERKS[id].maxStacks]),
    );
    for (let seed = 0; seed < 20; seed++) {
      expect(rollPerks(maxed, createRng(seed)).sort()).toEqual(['medic', 'reinforcements']);
    }
  });

  it('is deterministic for a seed', () => {
    expect(rollPerks({}, createRng(9))).toEqual(rollPerks({}, createRng(9)));
  });
});

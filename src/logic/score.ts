import { SPECIES, getSpecies, type FishId } from '../fish';

export type Catches = Partial<Record<FishId, number>>;

export function addCatch(catches: Catches, id: FishId): void {
  catches[id] = (catches[id] ?? 0) + 1;
}

export function totalScore(catches: Catches): number {
  let sum = 0;
  for (const [id, n] of Object.entries(catches) as [FishId, number][]) {
    sum += getSpecies(id).points * n;
  }
  return sum;
}

/** リザルト表示用：魚種表の順に並べた内訳。 */
export function breakdown(catches: Catches) {
  return SPECIES.filter((s) => (catches[s.id] ?? 0) > 0).map((s) => {
    const count = catches[s.id] ?? 0;
    return { species: s, count, subtotal: s.points * count };
  });
}

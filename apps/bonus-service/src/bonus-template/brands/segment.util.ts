/**
 * Landing-promo requests identify the target audience purely through
 * `allowedForGroups`/`disallowedForGroups` (e.g. `["all_except_vip"]`) —
 * they carry no separate "regular"/"vip" flag and their promo text has no
 * standalone "Reg"/"VIP" line either. Falls back to the caller's group
 * lists (in that order) only after `options.segment` and the text's own
 * "Reg"/"VIP" line have both come up empty — those two remain the primary,
 * more explicit signals.
 */
export function inferSegmentFromGroups(
  allowedForGroups?: string[],
  disallowedForGroups?: string[],
): 'regular' | 'vip' | undefined {
  if (allowedForGroups?.includes('all_vip')) return 'vip';
  if (allowedForGroups?.includes('all_except_vip')) return 'regular';
  if (disallowedForGroups?.includes('all_vip')) return 'regular';
  if (disallowedForGroups?.includes('all_except_vip')) return 'vip';
  return undefined;
}

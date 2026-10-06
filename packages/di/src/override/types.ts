import type { Resolvable } from '../lifetime/captive';
import type { IsUnion } from '../token/name';
import type { Token } from '../token/token';

/**
 * `unknown` when `override` may bind `K` to a value, else a refusal. Every
 * Provider may be overridden, whatever its lifetime, so the check is a Scope's
 * (`Resolvable` with both maps visible), plus one more: a Slot is refused,
 * since its value comes from `createScope`, which is where a test passes its
 * fake.
 */
export type Overridable<K, Singletons, Scoped, Slots> = Resolvable<
	K,
	Singletons,
	Scoped,
	'scoped'
> &
	(IsUnion<K> extends true
		? unknown
		: K extends Token<infer N, infer _>
			? [N] extends [never]
				? unknown
				: N extends keyof Slots
					? {
							readonly [M in `Token '${N}' is a Slot: pass its value to createScope instead`]: never;
						}
					: unknown
			: unknown);

import type { LiteralName } from '../token/name';

/**
 * Refuses a name that is not exactly one string literal (a widened `string`
 * or a pattern would key every name at once), and a name already provided,
 * as a singleton, scoped, or a Slot.
 */
export type Unprovided<N extends string, Singletons, Scoped> = LiteralName<N> &
	// Distributes, which is harmless: LiteralName already refuses a union.
	// Kept distributive on purpose: a non-distributive form made every
	// Container<P> assignable to every Container<Q>.
	(N extends keyof Singletons | keyof Scoped
		? { readonly [K in `Token name '${N}' is already provided`]: never }
		: unknown);

/** What `provide` and `slot` return for a name that is not one literal. */
export interface NotOneLiteralName {
	readonly 'a Token name must be exactly one string literal': never;
}

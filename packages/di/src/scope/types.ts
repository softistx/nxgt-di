import type { Resolvable } from '../lifetime/captive';
import type { AnyToken, TokenValue } from '../token/token';

/** Carries a Scope's maps. Type-only: no Scope has it at runtime. */
declare const maps: unique symbol;

/**
 * A short-lived child of a Container, usually one per request. It resolves
 * everything its Container provides: scoped values once per Scope,
 * singletons shared with the Container, transients new each time.
 *
 * Disposing of it disposes of what it created (its scoped values and the
 * transients it resolved) in reverse creation order, never a singleton, and
 * never a Slot's value, which came from outside.
 */
export interface Scope<Singletons, Scoped> extends AsyncDisposable {
	/** Type-only, absent at runtime: makes the Scope invariant in its maps. */
	readonly [maps]: (maps: [Singletons, Scoped]) => [Singletons, Scoped];

	/** Resolves a Token. Always a Promise, even for a sync factory or a Slot. */
	resolve<K extends AnyToken>(
		token: K & Resolvable<K, Singletons, Scoped, 'scoped'>,
	): Promise<TokenValue<K>>;

	/**
	 * Disposes of what this Scope created, in reverse creation order. A second
	 * call does nothing; a resolve from now on rejects.
	 */
	[Symbol.asyncDispose](): Promise<void>;
}

/**
 * The argument of `createScope`: a value for every Slot, keyed by its Token's
 * name, and nothing else. A key that is not a Slot is refused by name.
 */
export type SlotValues<V, Slots> = V & {
	readonly [K in Exclude<keyof V, keyof Slots>]: {
		readonly 'not a Slot of this Container': never;
	};
};

/** `createScope`'s parameters: optional when the Container has no Slot. */
export type CreateScopeArgs<V, Slots> = [keyof Slots] extends [never]
	? [slots?: SlotValues<V, Slots>]
	: [slots: SlotValues<V, Slots>];

/**
 * `unknown` when a Scope of these maps resolves `K`, else a refusal whose
 * property name says why, as `resolve` reports it. For an integration that
 * checks Tokens before any Scope exists: `@nxgt/di-hono`'s `expose`
 * intersects each Token with it.
 */
export type ScopeResolvable<K, Singletons, Scoped> = Resolvable<
	K,
	Singletons,
	Scoped,
	'scoped'
>;

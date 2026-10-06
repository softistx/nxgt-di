import type { IsUnion, LiteralName } from '../token/name';
import type { AnyToken, Token, TokenValue } from '../token/token';

/**
 * Who is resolving, for `Resolvable`:
 * - `scoped`: a Scope, or a factory's `get`. It sees both maps; in a
 *   singleton's `get`, the scoped entries are `Captured`, and refused.
 * - `container`: the Container itself, which has no Scope to make a scoped
 *   value in, so it resolves singletons only.
 */
export type Reach = 'scoped' | 'container';

/** Brands a scoped entry a singleton's factory must not resolve. */
declare const captured: unique symbol;

/**
 * A scoped entry as a singleton's factory (or a transient bound to
 * singleton) sees it: present, so the refusal can name the Captive
 * dependency, and branded, so it is never mistaken for the value.
 */
export interface Captured<T> {
	readonly [captured]: T;
}

/** The scoped map with every entry `Captured`. */
export type CapturedMap<Scoped> = { [K in keyof Scoped]: Captured<Scoped[K]> };

/** Carries what a Resolver sees. Type-only: no Resolver has it at runtime. */
declare const sees: unique symbol;

/**
 * What a factory is handed: `get` resolves a Token provided BEFORE the
 * Provider that factory belongs to. A singleton's factory, or a transient
 * bound to singleton, is handed its scoped entries `Captured`, so asking for
 * one is a Captive dependency and fails to compile.
 */
export interface Resolver<Singletons, Scoped = Record<never, never>> {
	/**
	 * Type-only, absent at runtime: makes a Resolver covariant in what it
	 * sees. One that sees more stands in for one that sees less, so a
	 * reusable factory typed with fewer Tokens fits a bigger Container; a
	 * factory annotated to see more than it is given (a scoped Token from a
	 * singleton, a Token not provided yet) is refused. Without it, `get` being
	 * a method made the comparison bivariant.
	 */
	readonly [sees]?: {
		readonly singletons: Singletons;
		readonly scoped: Scoped;
	};

	get<K extends AnyToken>(
		token: K & Resolvable<K, Singletons, Scoped, 'scoped'>,
	): Promise<TokenValue<K>>;
}

/** How a Provider makes its value. It may be sync or async. */
export type Factory<Singletons, Scoped, T> = (
	resolver: Resolver<Singletons, Scoped>,
) => T | PromiseLike<T>;

/**
 * `unknown` when `K` may be resolved from `R`, else a refusal: a property
 * named after the problem, so the compiler's message says what is wrong. It
 * refuses a union of Tokens, anything not a Token with one name, a Token not
 * provided or provided with another value type, a `Captured` entry (the
 * Captive dependency check), and a scoped Token from the Container.
 */
export type Resolvable<K, Singletons, Scoped, R extends Reach> =
	IsUnion<K> extends true
		? { readonly 'resolve one Token at a time': never }
		: K extends Token<infer N, infer T>
			? [N] extends [never]
				? { readonly 'not a resolvable Token': never }
				: LiteralName<N> & Lookup<N, T, Singletons, Scoped, R>
			: { readonly 'not a resolvable Token': never };

type Lookup<
	N extends string,
	T,
	Singletons,
	Scoped,
	R extends Reach,
> = N extends keyof Singletons
	? Same<N, T, Singletons[N]>
	: N extends keyof Scoped
		? Scoped[N] extends Captured<unknown>
			? {
					readonly [M in `Token '${N}' is scoped, captured by a singleton`]: never;
				}
			: R extends 'scoped'
				? Same<N, T, Scoped[N]>
				: {
						readonly [M in `Token '${N}' is scoped: resolve it from a Scope made by createScope`]: never;
					}
		: { readonly [M in `Token '${N}' is not provided`]: never };

/** Both ways, since a Token's value type is invariant. */
type Same<N extends string, T, V> = [T, V] extends [V, T]
	? unknown
	: {
			readonly [M in `Token '${N}' is provided with another value type`]: never;
		};

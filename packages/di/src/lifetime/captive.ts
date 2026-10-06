import type { IsUnion, LiteralName } from '../token/name';
import type { AnyToken, Token, TokenValue } from '../token/token';

/**
 * Who is resolving, which decides what is visible:
 * - `scoped`: a Scope, a scoped factory, or a transient bound to scoped. It
 *   sees everything.
 * - `singleton`: a singleton factory, or a transient bound to singleton. A
 *   scoped value would be a Captive dependency, so it sees singletons only.
 * - `container`: the Container itself, which has no Scope to make a scoped
 *   value in, so it resolves singletons only.
 */
export type Reach = 'scoped' | 'singleton' | 'container';

/**
 * What a factory is handed: `get` resolves a Token provided BEFORE the
 * Provider that factory belongs to, if its `Reach` may see it.
 */
export interface Resolver<
	Singletons,
	Scoped = Record<never, never>,
	R extends Reach = 'scoped',
> {
	get<K extends AnyToken>(
		token: K & Resolvable<K, Singletons, Scoped, R>,
	): Promise<TokenValue<K>>;
}

/** How a Provider makes its value. It may be sync or async. */
export type Factory<Singletons, Scoped, R extends Reach, T> = (
	resolver: Resolver<Singletons, Scoped, R>,
) => T | PromiseLike<T>;

/**
 * `unknown` when `K` may be resolved from `R`, else a refusal: a property
 * named after the problem, so the compiler's message says what is wrong. It
 * refuses a union of Tokens, anything not a Token with one name, a Token not
 * provided or provided with another value type, and a scoped Token where only
 * singletons are visible: the Captive dependency check.
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
		? R extends 'scoped'
			? Same<N, T, Scoped[N]>
			: R extends 'singleton'
				? {
						readonly [M in `Token '${N}' is scoped, captured by a singleton`]: never;
					}
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

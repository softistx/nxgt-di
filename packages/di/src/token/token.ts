import type { LiteralName } from './name';

/** Carries a Token's value type. Type-only: no Token has it at runtime. */
declare const value: unique symbol;

/**
 * A typed, named key that stands for one dependency.
 *
 * `Name` is the key in a Container's type, so it must be a literal; `id` is
 * the runtime identity. Two Tokens with the same name are still two Tokens,
 * and a Container refuses the second one (ADR 0002).
 */
export interface Token<Name extends string, T> {
	readonly name: Name;
	readonly id: symbol;
	/**
	 * Type-only, absent at runtime: makes `T` invariant, so a
	 * `Token<'db', Db>` is not a `Token<'db', Db | null>` either way round.
	 */
	readonly [value]: (value: T) => T;
}

/**
 * A Token of any name and value, for code that does not care which. Its
 * phantom is the top of `(value: T) => T`, so every Token is one, including a
 * `Token<N, never>`, which `Token<string, any>` would refuse.
 */
export interface AnyToken {
	readonly name: string;
	readonly id: symbol;
	readonly [value]: (value: never) => unknown;
}

/** The value type a Token stands for. */
export type TokenValue<K> = K extends Token<string, infer T> ? T : never;

/**
 * Creates a Token: `token<Db>()('db')`.
 *
 * Curried because TypeScript has no partial type-argument inference: `T` is
 * given, the name is inferred as a literal.
 */
export function token<T>(): <const N extends string>(
	name: N & LiteralName<N>,
) => Token<N, T> {
	return <const N extends string>(name: N) =>
		Object.freeze({ name, id: Symbol(name) }) as unknown as Token<N, T>;
}

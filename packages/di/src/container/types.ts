import type { IsUnion, LiteralName } from '../token/name';
import type { AnyToken, Token, TokenValue } from '../token/token';

/**
 * How long a resolved value lives: `singleton`, once per Container, or
 * `transient`, new on every resolve.
 */
export type Lifetime = 'singleton' | 'transient';

/** No Token provided yet: the type of `container()`. */
export type NoTokens = Record<never, never>;

/**
 * What a factory is handed: `get` resolves any Token provided BEFORE the
 * Provider that factory belongs to, and nothing else.
 */
export interface Resolver<Provided> {
	get<K extends AnyToken>(
		token: K & Resolvable<K, Provided>,
	): Promise<TokenValue<K>>;
}

/**
 * Refuses a Token that `Provided` lacks, or has under the same name with
 * another value type, and a union of Tokens, which would resolve to a union
 * of values with no way to tell which. The refusal is a property named after
 * the problem, so the compiler's message says what is wrong.
 */
export type Resolvable<K, Provided> =
	IsUnion<K> extends true
		? { readonly 'resolve one Token at a time': never }
		: K extends Token<infer N, infer T>
			? LiteralName<N> & ProvidedAs<N, T, Provided>
			: never;

type ProvidedAs<N extends string, T, Provided> = N extends keyof Provided
	? // Both ways, since a Token's value type is invariant.
		[T, Provided[N]] extends [Provided[N], T]
		? unknown
		: {
				readonly [M in `Token '${N}' is provided with another value type`]: never;
			}
	: { readonly [M in `Token '${N}' is not provided`]: never };

/** How a Provider makes its value. It may be sync or async. */
export type Factory<Provided, T> = (
	resolver: Resolver<Provided>,
) => T | PromiseLike<T>;

/** The options of `provide`. */
export interface ProvideOptions<T> {
	/** `singleton` (the default) or `transient`. */
	readonly lifetime?: Lifetime | undefined;
	/**
	 * Disposes of the value. Without it, the value's `Symbol.asyncDispose` is
	 * called, failing that its `Symbol.dispose`, failing that nothing.
	 */
	readonly dispose?: ((value: T) => void | PromiseLike<void>) | undefined;
}

/**
 * Refuses a name that is not exactly one string literal (a widened `string`
 * or a pattern would key every name at once), and a name `Provided` already
 * has. Not distributive: a union holding one taken name is refused whole.
 */
export type Unprovided<N extends string, Provided> =
	LiteralName<N> extends infer Refusal
		? unknown extends Refusal
			? [Extract<N, keyof Provided>] extends [never]
				? unknown
				: { readonly [K in `Token name '${N}' is already provided`]: never }
			: Refusal
		: never;

/**
 * The Providers an application has declared. Its type lists every Token it
 * can resolve, by name, so asking for one it lacks fails to compile.
 *
 * Each `provide` returns a new Container and leaves this one as it was. When
 * disposed, it disposes of every value it created, in reverse creation order.
 */
export interface Container<Provided = NoTokens> extends AsyncDisposable {
	/**
	 * Adds a Provider for `token`. Its factory sees only the Tokens provided
	 * before it, so a missing dependency or a cycle fails to compile, and a
	 * Token whose name is already provided is refused.
	 */
	provide<N extends string, T>(
		token: Token<N, T> & Unprovided<N, Provided>,
		factory: Factory<Provided, NoInfer<T>>,
		options?: ProvideOptions<NoInfer<T>>,
		// Written out rather than behind an alias, so a hover shows one flat
		// object, `Container<{ db: Db; users: Users }>`, not nested aliases.
	): Container<{
		[K in keyof Provided | N]: K extends keyof Provided ? Provided[K] : T;
	}>;

	/**
	 * Disposes of every value this Container created, in reverse creation
	 * order. A second call does nothing; a resolve from now on rejects.
	 */
	[Symbol.asyncDispose](): Promise<void>;

	/** Resolves a Token. Always a Promise, even for a sync factory. */
	resolve<K extends AnyToken>(
		token: K & Resolvable<K, Provided>,
	): Promise<TokenValue<K>>;
}

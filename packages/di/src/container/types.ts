import type { CapturedMap, Factory, Resolvable } from '../lifetime/captive';
import type {
	Bound,
	CountsAs,
	Effective,
	Lifetime,
	ProvideOptions,
	Sees,
} from '../lifetime/lifetime';
import type { CreateScopeArgs, Scope } from '../scope/types';
import type { IsLiteralName, LiteralName } from '../token/name';
import type { AnyToken, Token, TokenValue } from '../token/token';

/** Carries a Container's maps. Type-only: no Container has it at runtime. */
declare const maps: unique symbol;

/** No Token provided yet: the type of `container()`. */
export type NoTokens = Record<never, never>;

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

/**
 * The Providers an application has declared. Its type lists every Token it
 * can resolve, by name, in two maps: `Singletons` (singletons, and transients
 * bound to singleton) and `Scoped` (scoped Providers, transients bound to
 * scoped, and Slots). `Slots` lists the values `createScope` must be given.
 *
 * Each `provide` returns a new Container and leaves this one as it was. When
 * disposed, it disposes of every value it created, in reverse creation order;
 * its Scopes are their owners' to dispose.
 */
export interface Container<
	Singletons = NoTokens,
	Scoped = NoTokens,
	Slots = NoTokens,
> extends AsyncDisposable {
	/**
	 * Type-only, absent at runtime: makes the Container invariant in all three
	 * maps whatever its methods do. `createScope`'s conditional parameters
	 * leave TypeScript unable to measure variance, and the structural fallback
	 * would let a Container that lacks a Token pass for one that has it.
	 */
	readonly [maps]: (
		maps: [Singletons, Scoped, Slots],
	) => [Singletons, Scoped, Slots];

	/**
	 * Adds a Provider for `token`. Its factory sees only the Tokens provided
	 * before it, so a missing dependency or a cycle fails to compile, and a
	 * Token whose name is already provided is refused. A singleton factory,
	 * or a transient bound to singleton, does not see scoped Tokens: that
	 * would be a Captive dependency.
	 */
	provide<
		N extends string,
		T,
		L extends Lifetime | undefined = 'singleton',
		B extends Bound = 'singleton',
	>(
		token: Token<N, T> & Unprovided<N, Singletons, Scoped>,
		factory: Factory<
			Singletons,
			Sees<L, B> extends 'scoped' ? Scoped : CapturedMap<Scoped>,
			NoInfer<T>
		>,
		// Optional only for a singleton: any other lifetime must be passed,
		// for the runtime to see it, even when `L` is given explicitly.
		...options: [Effective<L>] extends ['singleton']
			? [options?: ProvideOptions<NoInfer<T>, L, B>]
			: [options: ProvideOptions<NoInfer<T>, L, B>]
		// The maps are written out rather than behind an alias, so a hover
		// shows flat objects, not nested aliases.
	): IsLiteralName<N> extends true
		? CountsAs<L, B> extends 'singleton'
			? Container<
					{
						[K in keyof Singletons | N]: K extends keyof Singletons
							? Singletons[K]
							: T;
					},
					Scoped,
					Slots
				>
			: Container<
					Singletons,
					{ [K in keyof Scoped | N]: K extends keyof Scoped ? Scoped[K] : T },
					Slots
				>
		: NotOneLiteralName;

	/**
	 * Declares a Slot: a scoped Token whose value the Container does not make,
	 * but every `createScope` must be given, keyed by the Token's name.
	 */
	slot<N extends string, T>(
		token: Token<N, T> & Unprovided<N, Singletons, Scoped>,
	): IsLiteralName<N> extends true
		? Container<
				Singletons,
				{ [K in keyof Scoped | N]: K extends keyof Scoped ? Scoped[K] : T },
				{ [K in keyof Slots | N]: K extends keyof Slots ? Slots[K] : T }
			>
		: NotOneLiteralName;

	/**
	 * Creates a Scope, given a value for every Slot, keyed by Token name. A
	 * missing Slot, an unknown key or a wrong value type fails to compile.
	 */
	createScope<V extends Slots>(
		...slots: CreateScopeArgs<V, Slots>
	): Scope<Singletons, Scoped>;

	/**
	 * Disposes of every value this Container created, in reverse creation
	 * order. A second call does nothing; a resolve from now on rejects.
	 */
	[Symbol.asyncDispose](): Promise<void>;

	/**
	 * Resolves a singleton, or a transient bound to singleton. Always a
	 * Promise, even for a sync factory. A scoped Token needs a Scope.
	 */
	resolve<K extends AnyToken>(
		token: K & Resolvable<K, Singletons, Scoped, 'container'>,
	): Promise<TokenValue<K>>;
}

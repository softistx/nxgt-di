import type { CapturedMap, Factory, Resolvable } from '../lifetime/captive';
import type {
	Bound,
	CountsAs,
	Effective,
	Lifetime,
	ProvideOptions,
	Sees,
} from '../lifetime/lifetime';
import type { Module, Requirements, Usable } from '../module/types';
import type { Overridable } from '../override/types';
import type { CreateScopeArgs, Scope } from '../scope/types';
import type { IsLiteralName } from '../token/name';
import type { AnyToken, Token, TokenValue } from '../token/token';
import type { NotOneLiteralName, Unprovided } from './names';

/** Carries a Container's maps. Type-only: no Container has it at runtime. */
declare const maps: unique symbol;

/** No Token provided yet: the type of `container()`. */
export type NoTokens = Record<never, never>;

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
	 * Adds a Module's Providers. It fails to compile when the Container lacks
	 * what the Module needs (or has it with another value type, or scoped
	 * where a singleton is needed), or already has a name the Module adds.
	 * What it adds is visible only to what comes after.
	 */
	use<R extends Requirements, AddS, AddSc, AddSl>(
		module: Module<R, AddS, AddSc, AddSl> &
			Usable<R, AddS, AddSc, Singletons, Scoped, Slots>,
	): Container<
		{
			[K in keyof Singletons | keyof AddS]: K extends keyof Singletons
				? Singletons[K]
				: K extends keyof AddS
					? AddS[K]
					: never;
		},
		{
			[K in keyof Scoped | keyof AddSc]: K extends keyof Scoped
				? Scoped[K]
				: K extends keyof AddSc
					? AddSc[K]
					: never;
		},
		{
			[K in keyof Slots | keyof AddSl]: K extends keyof Slots
				? Slots[K]
				: K extends keyof AddSl
					? AddSl[K]
					: never;
		}
	>;

	/**
	 * A new Container with the same Providers, except that `token` gives
	 * `value`, whatever its lifetime: a fake in a test, usually. The original
	 * is unchanged, and the two share no created value. The Container does
	 * not dispose of `value`: the caller owns it. A Slot is refused: give its
	 * value to `createScope`.
	 */
	override<K extends AnyToken>(
		token: K & Overridable<K, Singletons, Scoped, Slots>,
		value: NoInfer<TokenValue<K>>,
	): Container<Singletons, Scoped, Slots>;

	/**
	 * Creates every singleton now, in provide order, so a failing connection
	 * stops the boot rather than the first request. Rejects with the first
	 * factory's error; what failed is not cached, so a later resolve retries.
	 * Transients, even bound to singleton, are not created: nothing caches
	 * them.
	 */
	init(): Promise<void>;

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

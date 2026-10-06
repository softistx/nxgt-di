import type { Container, NoTokens } from '../container/types';

/**
 * What a Module needs from the Container it is used in, one map each:
 * - `singletons`: Tokens it needs as singletons. A scoped entry does not do,
 *   since the Module's singletons may depend on them.
 * - `scoped`: Tokens it needs at least scoped: a singleton, a scoped entry or
 *   a Slot all do, since only its scoped Providers may use them.
 * - `slots`: Slots it needs declared, so its Scopes are given their values.
 */
export interface Requirements {
	readonly singletons?: object;
	readonly scoped?: object;
	readonly slots?: object;
}

/** One map of `R`, or no Token when `R` does not name it. */
export type Need<R, K extends keyof Requirements> = K extends keyof R
	? NonNullable<R[K]>
	: NoTokens;

/** The Container a Module's `build` is handed: its requirements, no more. */
export type ModuleContainer<R> = Container<
	Need<R, 'singletons'>,
	{
		[K in
			| keyof Need<R, 'scoped'>
			| keyof Need<R, 'slots'>]: K extends keyof Need<R, 'slots'>
			? Need<R, 'slots'>[K]
			: K extends keyof Need<R, 'scoped'>
				? Need<R, 'scoped'>[K]
				: never;
	},
	Need<R, 'slots'>
>;

/** Carries a Module's types. Type-only: no Module has it at runtime. */
declare const moduleTypes: unique symbol;

/**
 * A reusable group of Providers that states what it needs (`R`) and what it
 * adds to each map. Made by `module<R>()(build)`, applied with `use`.
 */
export interface Module<R extends Requirements, AddS, AddSc, AddSl> {
	readonly [moduleTypes]: (needs: R) => [AddS, AddSc, AddSl];
	/** Adds the Module's Providers to a Container. */
	readonly build: (container: never) => unknown;
}

type Same<A, B> = [A, B] extends [B, A] ? true : false;

type SingletonGaps<R, S, Sc> = {
	[K in keyof R & string]: K extends keyof S
		? Same<R[K], S[K]> extends true
			? never
			: `Module needs Token '${K}' with another value type`
		: K extends keyof Sc
			? `Module needs Token '${K}' as a singleton, but it is scoped`
			: `Module needs Token '${K}', which is not provided`;
}[keyof R & string];

type ScopedGaps<R, S, Sc> = {
	[K in keyof R & string]: K extends keyof Sc
		? Same<R[K], Sc[K]> extends true
			? never
			: `Module needs Token '${K}' with another value type`
		: K extends keyof S
			? Same<R[K], S[K]> extends true
				? never
				: `Module needs Token '${K}' with another value type`
			: `Module needs Token '${K}', which is not provided`;
}[keyof R & string];

type SlotGaps<R, S, Sc, Sl> = {
	[K in keyof R & string]: K extends keyof Sl
		? Same<R[K], Sl[K]> extends true
			? never
			: `Module needs Token '${K}' with another value type`
		: K extends keyof S | keyof Sc
			? `Module needs Token '${K}' as a Slot`
			: `Module needs Token '${K}', which is not provided`;
}[keyof R & string];

type Clashes<AddS, AddSc, S, Sc> = keyof AddS | keyof AddSc extends infer K
	? K extends (keyof S | keyof Sc) & string
		? `Module provides Token '${K}', which is already provided`
		: never
	: never;

/**
 * `unknown` when a Container with maps `S`, `Sc`, `Sl` may use a Module that
 * needs `R` and adds `AddS` and `AddSc`, else a refusal naming every gap.
 */
export type Usable<R, AddS, AddSc, S, Sc, Sl> =
	| SingletonGaps<Need<R, 'singletons'>, S, Sc>
	| ScopedGaps<Need<R, 'scoped'>, S, Sc>
	| SlotGaps<Need<R, 'slots'>, S, Sc, Sl>
	| Clashes<AddS, AddSc, S, Sc> extends infer Gap
	? [Gap] extends [never]
		? unknown
		: { readonly [M in Gap & string]: never }
	: never;

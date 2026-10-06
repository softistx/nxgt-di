import type { Container } from '../container/types';
import type { Module, ModuleContainer, Need, Requirements } from './types';

/**
 * Declares a Module: `module<R>()(build)`. `R` states what it needs, one map
 * each; `build` is handed a Container that has exactly that, and returns it
 * with the Module's Providers added. Curried because TypeScript has no
 * partial type-argument inference: `R` is given, the rest is inferred.
 *
 * ```ts
 * const data = module<{ singletons: { config: Config } }>()((c) =>
 *   c.provide(Db, async ({ get }) => connect((await get(Config)).url)),
 * );
 * app.use(data);
 * ```
 */
export function module<R extends Requirements = Record<never, never>>(): <
	S,
	Sc,
	Sl,
>(
	build: (container: ModuleContainer<R>) => Container<S, Sc, Sl>,
	// Written out rather than through an alias, so a hover shows what the
	// Module adds as flat objects.
) => Module<
	R,
	{ [K in Exclude<keyof S, keyof Need<R, 'singletons'>>]: S[K] },
	{
		[K in Exclude<
			keyof Sc,
			keyof Need<R, 'scoped'> | keyof Need<R, 'slots'>
		>]: Sc[K];
	},
	{ [K in Exclude<keyof Sl, keyof Need<R, 'slots'>>]: Sl[K] }
> {
	// The Module's types live only in its phantom; at runtime it is `build`.
	return (build) => Object.freeze({ build }) as never;
}

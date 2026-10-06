import type { Container } from '../container/types';
import type { Module, Need, Requirements } from './types';

/**
 * Declares a Module: `defineModule<R>()(build)`. `R` states what it needs, one map
 * each; `build` is handed a Container that has exactly that, and returns it
 * with the Module's Providers added. Curried because TypeScript has no
 * partial type-argument inference: `R` is given, the rest is inferred.
 *
 * ```ts
 * const data = defineModule<{ singletons: { config: Config } }>()((c) =>
 *   c.provide(Db, async ({ get }) => connect((await get(Config)).url)),
 * );
 * app.use(data);
 * ```
 */
export function defineModule<R extends Requirements = Record<never, never>>(): <
	S,
	Sc,
	Sl,
>(
	// Written out rather than through aliases, so a hover shows flat
	// objects: the Container `build` is handed (exactly the requirements; a
	// Slot is scoped too), and what the Module adds.
	build: (
		container: Container<
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
		>,
	) => Container<S, Sc, Sl>,
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

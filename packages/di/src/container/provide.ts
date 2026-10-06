import { DuplicateTokenNameError } from '../errors/errors';
import type { Lifetime } from '../lifetime/lifetime';
import type { AnyToken } from '../token/token';

/** A Provider as the runtime holds it, its types erased. */
export interface Provider {
	readonly token: AnyToken;
	readonly factory: (resolver: {
		get(token: AnyToken): Promise<unknown>;
	}) => unknown;
	readonly lifetime: Lifetime;
	/** A Slot: no factory runs; each Scope is given the value. */
	readonly slot: boolean;
	readonly dispose: ((value: unknown) => unknown) | undefined;
	/**
	 * Whether the value is the Container's to dispose of. Not for an
	 * overridden value, which the caller passed in and still owns.
	 */
	readonly owned: boolean;
}

/** The Providers of one Container, by Token id. Never mutated once built. */
export type Providers = ReadonlyMap<symbol, Provider>;

/**
 * `providers` with `provider` added, as a new map. Throws when its Token's
 * name is taken, which the types already refuse.
 */
export function addProvider(
	providers: Providers,
	provider: Provider,
): Providers {
	for (const existing of providers.values()) {
		if (existing.token.name === provider.token.name)
			throw new DuplicateTokenNameError(provider.token.name);
	}
	return new Map(providers).set(provider.token.id, provider);
}

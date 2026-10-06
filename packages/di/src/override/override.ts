import { type Provider, type Providers, tick } from '../container/provide';
import { SlotOverrideError, TokenNotProvidedError } from '../errors/errors';
import type { AnyToken } from '../token/token';

/**
 * `providers` with `token`'s Provider replaced by one that gives `value`,
 * keeping its lifetime and its place in provide order. The value is not
 * owned: no Container disposes of it. Throws for a Token not provided, or a
 * Slot, which the types already refuse.
 */
export function overrideProvider(
	providers: Providers,
	token: AnyToken,
	value: unknown,
): Providers {
	const existing = providers.get(token.id);
	if (!existing) throw new TokenNotProvidedError(token.name);
	if (existing.slot) throw new SlotOverrideError(token.name);
	const provider: Provider = {
		...existing,
		factory: () => value,
		dispose: undefined,
		owned: false,
		replaces: existing,
		born: tick(),
	};
	return new Map(providers).set(token.id, provider);
}

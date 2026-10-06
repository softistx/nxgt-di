import type { Providers } from '../container/provide';
import { MissingSlotError } from '../errors/errors';

/**
 * Puts each Slot's value, given by Token name, in a new Scope's cache. Throws
 * when one is missing, which the types already refuse; a key that is no Slot
 * is ignored. The values are not the Scope's: it never disposes of them.
 */
export function fillSlots(
	providers: Providers,
	values: Readonly<Record<string, unknown>>,
	cache: Map<symbol, Promise<unknown>>,
): void {
	const missing: string[] = [];
	for (const { token, slot } of providers.values()) {
		if (!slot) continue;
		if (Object.hasOwn(values, token.name))
			cache.set(token.id, Promise.resolve(values[token.name]));
		else missing.push(token.name);
	}
	const [first, ...rest] = missing;
	if (first !== undefined) throw new MissingSlotError([first, ...rest]);
}

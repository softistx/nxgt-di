import { resolveToken } from './resolve';
import type { State } from './state';

/**
 * Creates every singleton, one after another in provide order, so each finds
 * its dependencies made and a failure is reported by the first factory that
 * failed. A Slot, a scoped Provider and a transient are skipped.
 */
export async function initSingletons(state: State): Promise<void> {
	for (const provider of state.providers.values()) {
		if (provider.lifetime !== 'singleton') continue;
		await resolveToken(state, undefined, provider.token);
	}
}

import { disposeOnce } from '../container/dispose';
import { resolveToken } from '../container/resolve';
import {
	createScopeState,
	type ScopeState,
	type State,
} from '../container/state';
import type { AnyToken } from '../token/token';
import { fillSlots } from './slots';

/**
 * The runtime behind every Scope. Its types are erased: `Scope<S, C>` is what
 * callers see.
 */
export class DiScope {
	readonly #state: ScopeState;

	constructor(container: State, slots: Readonly<Record<string, unknown>>) {
		this.#state = createScopeState(container);
		fillSlots(container.providers, slots, this.#state.cache);
	}

	// Arrow properties, not methods: `const { resolve } = scope` keeps working.

	readonly resolve = (token: AnyToken): Promise<unknown> =>
		resolveToken(this.#state.container, this.#state, token);

	readonly [Symbol.asyncDispose] = (): Promise<void> =>
		disposeOnce(this.#state);
}

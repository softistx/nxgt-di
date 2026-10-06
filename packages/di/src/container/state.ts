import type { Provider, Providers } from './provide';

/** A value a Container or a Scope created, which it owns and will dispose of. */
export interface Created {
	readonly provider: Provider;
	readonly value: unknown;
}

/** What owns created values: a Container, or one of its Scopes. */
export interface Owner {
	readonly kind: 'Container' | 'Scope';
	/**
	 * Each cached value's promise, settled or not, by Token id: a Container's
	 * singletons, or a Scope's scoped values and Slots.
	 */
	readonly cache: Map<symbol, Promise<unknown>>;
	/** Every value created, in creation order: disposal walks it backwards. */
	readonly created: Created[];
	/** The factories still running, which disposal waits for. */
	readonly pending: Set<Promise<unknown>>;
	/** Set once disposal begins: from then on, every resolve rejects. */
	disposal: Promise<void> | undefined;
}

/** What one Container holds at runtime. */
export interface State extends Owner {
	readonly kind: 'Container';
	readonly providers: Providers;
}

/** What one Scope holds at runtime. */
export interface ScopeState extends Owner {
	readonly kind: 'Scope';
	readonly container: State;
}

function owner<K extends Owner['kind']>(kind: K) {
	return {
		kind,
		cache: new Map<symbol, Promise<unknown>>(),
		created: [] as Created[],
		pending: new Set<Promise<unknown>>(),
		disposal: undefined,
	};
}

export function createState(providers: Providers): State {
	return { ...owner('Container'), providers };
}

export function createScopeState(container: State): ScopeState {
	return { ...owner('Scope'), container };
}

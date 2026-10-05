import type { Provider, Providers } from './provide';

/** A value a Container created, which it owns and will dispose of. */
export interface Created {
	readonly provider: Provider;
	readonly value: unknown;
}

/** What one Container holds at runtime. */
export interface State {
	readonly providers: Providers;
	/** Each singleton's promise, settled or not, by Token id. */
	readonly singletons: Map<symbol, Promise<unknown>>;
	/** Every value created, in creation order: disposal walks it backwards. */
	readonly created: Created[];
	/** The factories still running, which disposal waits for. */
	readonly pending: Set<Promise<unknown>>;
	/** Set once disposal begins: from then on, every resolve rejects. */
	disposal: Promise<void> | undefined;
}

export function createState(providers: Providers): State {
	return {
		providers,
		singletons: new Map(),
		created: [],
		pending: new Set(),
		disposal: undefined,
	};
}

import {
	ContainerDisposedError,
	TokenNotProvidedError,
} from '../errors/errors';
import type { AnyToken } from '../token/token';
import type { Provider } from './provide';
import type { State } from './state';

/**
 * Resolves `token` in a Container. A singleton is created once and its
 * promise cached, so concurrent resolves share it; a factory that fails is
 * dropped from the cache, so the next resolve tries again. A transient is
 * created on every call. Either way, the Container owns what it creates.
 */
export function resolveToken(state: State, token: AnyToken): Promise<unknown> {
	if (state.disposal)
		return Promise.reject(new ContainerDisposedError(token.name));
	const provider = state.providers.get(token.id);
	if (!provider) return Promise.reject(new TokenNotProvidedError(token.name));
	if (provider.lifetime === 'transient') return create(state, provider);

	const cached = state.singletons.get(token.id);
	if (cached) return cached;
	const created = create(state, provider);
	state.singletons.set(token.id, created);
	created.catch(() => {
		if (state.singletons.get(token.id) === created)
			state.singletons.delete(token.id);
	});
	return created;
}

/**
 * Runs `provider`'s factory and records the value as created. A value that
 * arrives once disposal has begun is still recorded, so it is disposed of,
 * but whoever asked for it gets a rejection instead.
 */
function create(state: State, provider: Provider): Promise<unknown> {
	const resolver = { get: (token: AnyToken) => resolveToken(state, token) };
	const run = (async () => {
		const value = await provider.factory(resolver);
		state.created.push({ provider, value });
		if (state.disposal) throw new ContainerDisposedError(provider.token.name);
		return value;
	})();
	state.pending.add(run);
	const settle = () => state.pending.delete(run);
	run.then(settle, settle);
	return run;
}

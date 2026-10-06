import {
	ContainerDisposedError,
	ScopeDisposedError,
	ScopeRequiredError,
	TokenNotProvidedError,
} from '../errors/errors';
import type { AnyToken } from '../token/token';
import type { Provider } from './provide';
import type { Owner, ScopeState, State } from './state';

/**
 * Resolves `token` for a Container, or for one of its Scopes when `scope` is
 * given. Without a Scope (the Container's own `resolve`, a singleton's
 * factory) a scoped Token is refused.
 *
 * - A singleton is made in the Container, with no Scope, whoever asks for it,
 *   so it cannot capture a scoped value, and the Container owns it.
 * - A scoped value is made once per Scope, which owns it. A Slot's value is
 *   already in the Scope's cache.
 * - A transient is made on every call, and owned by whoever resolved it: the
 *   Scope if there is one, else the Container.
 *
 * A cached promise is shared by concurrent resolves, and dropped when the
 * factory fails, so the next resolve tries again.
 */
export function resolveToken(
	container: State,
	scope: ScopeState | undefined,
	token: AnyToken,
): Promise<unknown> {
	const owner: Owner = scope ?? container;
	if (owner.disposal) return Promise.reject(disposed(owner, token.name));
	const provider = container.providers.get(token.id);
	if (!provider) return Promise.reject(new TokenNotProvidedError(token.name));

	switch (provider.lifetime) {
		case 'singleton':
			if (container.disposal)
				return Promise.reject(new ContainerDisposedError(token.name));
			return cached(container, provider, () =>
				create(container, container, undefined, provider),
			);
		case 'scoped':
			if (!scope) return Promise.reject(new ScopeRequiredError(token.name));
			return cached(scope, provider, () =>
				create(container, scope, scope, provider),
			);
		case 'transient':
			return create(container, owner, scope, provider);
	}
}

function cached(
	owner: Owner,
	provider: Provider,
	make: () => Promise<unknown>,
): Promise<unknown> {
	const id = provider.token.id;
	const hit = owner.cache.get(id);
	if (hit) return hit;
	const made = make();
	owner.cache.set(id, made);
	// Registered before any caller can await `made`, so the failed entry is
	// gone before anyone could resolve again: nothing newer to protect.
	made.catch(() => owner.cache.delete(id));
	return made;
}

/**
 * Runs `provider`'s factory, its `get` reaching as far as `scope`, and
 * records the value in `owner`. A value that arrives once the owner's
 * disposal has begun is still recorded, so it is disposed of, but whoever
 * asked for it gets a rejection instead.
 */
function create(
	container: State,
	owner: Owner,
	scope: ScopeState | undefined,
	provider: Provider,
): Promise<unknown> {
	const resolver = {
		get: (token: AnyToken) => resolveToken(container, scope, token),
	};
	const run = (async () => {
		const value = await provider.factory(resolver);
		if (provider.owned) owner.created.push({ provider, value });
		if (owner.disposal) throw disposed(owner, provider.token.name);
		return value;
	})();
	owner.pending.add(run);
	const settle = () => owner.pending.delete(run);
	run.then(settle, settle);
	return run;
}

function disposed(owner: Owner, token: string): Error {
	return owner.kind === 'Scope'
		? new ScopeDisposedError(token)
		: new ContainerDisposedError(token);
}

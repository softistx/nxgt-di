import type { AnyToken } from '@nxgt/di';
import type { Context, MiddlewareHandler, Next } from 'hono';
import { ScopeNotMountedError } from '../errors/errors';
import type { LazyScope } from '../scope/lazy-scope';

/** Each request's Scope, as one `di` middleware made it. */
export type Scopes = WeakMap<Context, LazyScope>;

/**
 * The middleware behind `deps.expose(tokens)`: resolves every Token in the
 * Scope `scopes` holds for the request, all at once, and sets each value on
 * `c.var` under its key before calling `next`. A request with no Scope there
 * never went through the `di` middleware: that is a `ScopeNotMountedError`.
 */
export function exposeFrom(
	scopes: Scopes,
	tokens: Readonly<Record<string, AnyToken>>,
): MiddlewareHandler {
	const entries = Object.entries(tokens);
	return async (c: Context, next: Next): Promise<void> => {
		const scope = scopes.get(c);
		if (!scope) throw new ScopeNotMountedError(Object.keys(tokens));
		const values = await Promise.all(
			entries.map(([, token]) => scope.resolve(token)),
		);
		entries.forEach(([key], i) => {
			c.set(key, values[i]);
		});
		await next();
	};
}

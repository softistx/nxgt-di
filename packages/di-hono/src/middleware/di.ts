import type { AnyToken, Container } from '@nxgt/di';
import type { Context, Next } from 'hono';
import { LazyScope, type RuntimeScope } from '../scope/lazy-scope';
import { exposeFrom, type Scopes } from './expose';
import type { Di, DiArgs, SlotsFn } from './types';

/** A Container as the runtime sees it, its types erased. */
interface RuntimeContainer {
	createScope(slots?: Readonly<Record<string, unknown>>): RuntimeScope;
}

/** The options once the types have done their work. */
interface RuntimeOptions {
	slots?: SlotsFn<Readonly<Record<string, unknown>>>;
	onDisposeError?: (error: unknown, c: Context) => void;
}

function logDisposeError(error: unknown, c: Context): void {
	console.error(
		`@nxgt/di-hono: disposing the Scope of ${c.req.method} ${c.req.path} failed`,
		error,
	);
}

/**
 * A Hono middleware that gives each request a Scope of `container`, as
 * `c.var.scope`. The Scope is lazy: created, and `slots` called, on its first
 * `resolve`, so a request that resolves nothing costs nothing. It is disposed
 * of once the rest of the chain has run, whether the handler returned or
 * threw.
 *
 * ```ts
 * const deps = di(container, { slots: (c) => ({ tenant: c.req.header('x-tenant') ?? 'public' }) });
 * app.use(deps);
 * app.use('/orders/*', deps.expose({ orders: Orders }));
 * ```
 */
export function di<Singletons, Scoped, Slots>(
	container: Container<Singletons, Scoped, Slots>,
	...args: DiArgs<Slots>
): Di<Singletons, Scoped> {
	const runtime = container as unknown as RuntimeContainer;
	const { slots, onDisposeError = logDisposeError }: RuntimeOptions =
		args[0] ?? {};
	// Keyed by the request's Context: Hono makes one per request and hands the
	// same one to every middleware, so `expose` finds the Scope of its own
	// `di`, never one another middleware put on `c.var`.
	const scopes: Scopes = new WeakMap();

	const middleware = async (c: Context, next: Next): Promise<void> => {
		// Mounted twice on one route: the outer one owns the Scope.
		if (scopes.has(c)) return next();
		const scope = new LazyScope(async () =>
			runtime.createScope(slots ? await slots(c) : undefined),
		);
		scopes.set(c, scope);
		// Through a plain Env: an application that augments Hono's
		// `ContextVariableMap` with its own `scope` type must not make this
		// line fail to compile against the source.
		const vars = c as Context<{ Variables: { scope: unknown } }>;
		// Nested under another `di`, whose Scope this one hides until `next`
		// returns: the outer middleware's code after its own `next` must see
		// its Scope again, not this one, disposed of below.
		const outer = vars.get('scope');
		vars.set('scope', scope);
		try {
			await next();
		} finally {
			// Unless something later replaced it: that value is not ours to undo.
			// With nothing before it, the disposed Scope stays, so a late
			// resolve gets ScopeDisposedError rather than an undefined.
			if (outer !== undefined && vars.get('scope') === scope)
				vars.set('scope', outer);
			// After `next`, so a streamed body that is still being written may
			// not use the Scope's values: see the guide.
			await scope[Symbol.asyncDispose]().catch((error: unknown) => {
				try {
					onDisposeError(error, c);
				} catch {
					// A logger that throws must not replace the response either.
				}
			});
		}
	};

	const expose = (tokens: Readonly<Record<string, AnyToken>>) =>
		exposeFrom(scopes, tokens);

	return Object.assign(middleware, { expose }) as unknown as Di<
		Singletons,
		Scoped
	>;
}

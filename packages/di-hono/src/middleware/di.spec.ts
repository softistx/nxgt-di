import { describe, expect, mock, test } from 'bun:test';
import { container, ScopeDisposedError, token } from '@nxgt/di';
import { Hono } from 'hono';
import { di } from './di';

const Tenant = token<string>()('tenant');
const Greeting = token<string>()('greeting');

/** A Container with one Slot and one scoped value that records its disposal. */
function setup(events: string[] = []) {
	const slots = mock((tenant: string | undefined) => ({
		tenant: tenant ?? 'public',
	}));
	const deps = di(
		container()
			.slot(Tenant)
			.provide(
				Greeting,
				async ({ get }) => {
					events.push('created');
					return `hello ${await get(Tenant)}`;
				},
				{ lifetime: 'scoped', dispose: () => void events.push('disposed') },
			),
		{ slots: (c) => slots(c.req.header('x-tenant')) },
	);
	return { deps, slots, events };
}

describe('di', () => {
	test('gives the handler a Scope, as c.var.scope', async () => {
		const { deps } = setup();
		const app = new Hono()
			.use(deps)
			.get('/', async (c) => c.text(await c.var.scope.resolve(Greeting)));

		const res = await app.request('/', { headers: { 'x-tenant': 'acme' } });

		expect(await res.text()).toBe('hello acme');
	});

	test('creates no Scope, and computes no Slot, for a request that resolves nothing', async () => {
		const { deps, slots, events } = setup();
		const app = new Hono().use(deps).get('/health', (c) => c.text('ok'));

		await app.request('/health');

		expect(slots).not.toHaveBeenCalled();
		expect(events).toEqual([]);
	});

	test('computes the Slots once per request, however many resolves', async () => {
		const { deps, slots } = setup();
		const app = new Hono().use(deps).get('/', async (c) => {
			await Promise.all([
				c.var.scope.resolve(Greeting),
				c.var.scope.resolve(Tenant),
			]);
			await c.var.scope.resolve(Greeting);
			return c.text('ok');
		});

		await app.request('/');
		await app.request('/');

		expect(slots).toHaveBeenCalledTimes(2);
	});

	test('accepts Slots computed asynchronously', async () => {
		const deps = di(container().slot(Tenant), {
			slots: async () => ({ tenant: 'later' }),
		});
		const app = new Hono()
			.use(deps)
			.get('/', async (c) => c.text(await c.var.scope.resolve(Tenant)));

		expect(await (await app.request('/')).text()).toBe('later');
	});

	test('disposes of the Scope once the handler has returned', async () => {
		const { deps, events } = setup();
		const app = new Hono().use(deps).get('/', async (c) => {
			await c.var.scope.resolve(Greeting);
			events.push('handled');
			return c.text('ok');
		});

		await app.request('/');

		expect(events).toEqual(['created', 'handled', 'disposed']);
	});

	test('disposes of the Scope when the handler throws, and keeps its error', async () => {
		const { deps, events } = setup();
		const app = new Hono()
			.use(deps)
			.get('/', async (c) => {
				await c.var.scope.resolve(Greeting);
				throw new Error('refused');
			})
			.onError((error, c) => c.text(error.message, 500));

		const res = await app.request('/');

		expect(res.status).toBe(500);
		expect(await res.text()).toBe('refused');
		expect(events).toEqual(['created', 'disposed']);
	});

	test('keeps resolve bound when destructured', async () => {
		const { deps } = setup();
		const app = new Hono().use(deps).get('/', async (c) => {
			const { resolve } = c.var.scope;
			return c.text(await resolve(Greeting));
		});

		expect(await (await app.request('/')).text()).toBe('hello public');
	});

	test('has disposed of the Scope by the time a streamed body is read', async () => {
		const { deps } = setup();
		const app = new Hono().use(deps).get('/', async (c) => {
			const { scope } = c.var;
			const early = await scope.resolve(Greeting);
			const body = new ReadableStream<string>({
				async pull(controller) {
					controller.enqueue(early);
					// A body still being written once the handler has returned.
					await Bun.sleep(1);
					controller.enqueue(
						await scope.resolve(Greeting).then(
							() => ' resolved',
							(error: Error) => ` ${error.name}`,
						),
					);
					controller.close();
				},
			});
			return c.body(body.pipeThrough(new TextEncoderStream()));
		});

		const res = await app.request('/');

		expect(await res.text()).toBe('hello public ScopeDisposedError');
	});

	test('gives each request a Scope of its own', async () => {
		const { deps } = setup();
		const seen: unknown[] = [];
		const app = new Hono().use(deps).get('/', (c) => {
			seen.push(c.var.scope);
			return c.text('ok');
		});

		await Promise.all([app.request('/'), app.request('/')]);

		expect(seen[0]).not.toBe(seen[1]);
	});

	test('rejects a resolve made after the request ended', async () => {
		const { deps } = setup();
		let late: (() => Promise<unknown>) | undefined;
		const app = new Hono().use(deps).get('/', (c) => {
			late = () => c.var.scope.resolve(Greeting);
			return c.text('ok');
		});

		await app.request('/');

		await expect(late?.()).rejects.toBeInstanceOf(ScopeDisposedError);
	});

	test('mounted twice on a route, makes one Scope, owned by the outer one', async () => {
		const { deps, slots, events } = setup();
		const scopes: unknown[] = [];
		const app = new Hono()
			.use(deps)
			.use((c, next) => {
				scopes.push(c.var.scope);
				return next();
			})
			.use(deps)
			.get('/', async (c) => {
				scopes.push(c.var.scope);
				return c.text(await c.var.scope.resolve(Greeting));
			});

		await app.request('/');

		expect(scopes[0]).toBe(scopes[1]);
		expect(slots).toHaveBeenCalledTimes(1);
		expect(events).toEqual(['created', 'disposed']);
	});

	test('nested under another di, gives the outer Scope back once the inner one is disposed', async () => {
		const outer = setup();
		const inner = di(
			container().provide(Tenant, () => 'inner', { lifetime: 'scoped' }),
		);
		let after: unknown;
		const app = new Hono()
			.use(outer.deps)
			.use(async (c, next) => {
				await next();
				// Past the inner middleware, which has disposed of its own Scope.
				after = await c.var.scope.resolve(Greeting).catch((e: Error) => e);
			})
			.use(inner)
			.get('/', async (c) => {
				await c.var.scope.resolve(Tenant);
				return c.text('ok');
			});

		await app.request('/');

		expect(after).toBe('hello public');
	});
});

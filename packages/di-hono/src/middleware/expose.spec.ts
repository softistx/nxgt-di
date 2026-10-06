import { describe, expect, mock, test } from 'bun:test';
import { container, token } from '@nxgt/di';
import { Hono } from 'hono';
import { ScopeNotMountedError } from '../errors/errors';
import { di } from './di';

const Config = token<{ region: string }>()('config');
const User = token<string>()('user');
const Orders = token<string[]>()('orders');

function setup() {
	const made = mock((user: string) => [`${user}-1`]);
	const deps = di(
		container()
			.provide(Config, () => ({ region: 'eu' }))
			.slot(User)
			.provide(Orders, async ({ get }) => made(await get(User)), {
				lifetime: 'scoped',
			}),
		{ slots: (c) => ({ user: c.req.header('x-user') ?? 'anonymous' }) },
	);
	return { deps, made };
}

describe('expose', () => {
	test('sets each value on c.var under its key', async () => {
		const { deps } = setup();
		const app = new Hono()
			.use(deps)
			.use(
				'/orders/*',
				deps.expose({ config: Config, me: User, orders: Orders }),
			)
			.get('/orders/mine', (c) =>
				c.json({
					region: c.var.config.region,
					me: c.var.me,
					orders: c.var.orders,
				}),
			);

		const res = await app.request('/orders/mine', {
			headers: { 'x-user': 'ada' },
		});

		expect(await res.json()).toEqual({
			region: 'eu',
			me: 'ada',
			orders: ['ada-1'],
		});
	});

	test('resolves in the request Scope, so the handler shares its values', async () => {
		const { deps, made } = setup();
		const app = new Hono()
			.use(deps)
			.get('/', deps.expose({ orders: Orders }), async (c) => {
				const again = await c.var.scope.resolve(Orders);
				return c.json(again === c.var.orders);
			});

		expect(await (await app.request('/')).json()).toBe(true);
		expect(made).toHaveBeenCalledTimes(1);
	});

	test('resolves nothing on a route it is not mounted on', async () => {
		const { deps, made } = setup();
		const app = new Hono()
			.use(deps)
			.use('/orders/*', deps.expose({ orders: Orders }))
			.get('/health', (c) => c.text('ok'));

		await app.request('/health');

		expect(made).not.toHaveBeenCalled();
	});

	test('throws ScopeNotMountedError when its di middleware is not mounted', async () => {
		const { deps } = setup();
		let caught: unknown;
		const app = new Hono()
			.get('/', deps.expose({ orders: Orders, me: User }), (c) =>
				c.text('unreachable'),
			)
			.onError((error, c) => {
				caught = error;
				return c.text('', 500);
			});

		await app.request('/');

		expect(caught).toBeInstanceOf(ScopeNotMountedError);
		expect(caught).toMatchObject({
			code: 'DI_SCOPE_NOT_MOUNTED',
			variables: ['orders', 'me'],
		});
	});

	test("throws ScopeNotMountedError under another di's middleware", async () => {
		const { deps } = setup();
		const other = setup().deps;
		let caught: unknown;
		const app = new Hono()
			.use(other)
			.get('/', deps.expose({ orders: Orders }), (c) => c.text('unreachable'))
			.onError((error, c) => {
				caught = error;
				return c.text('', 500);
			});

		await app.request('/');

		expect(caught).toBeInstanceOf(ScopeNotMountedError);
	});

	test('a resolve that fails goes to the app error handler, and the Scope is still disposed', async () => {
		const Broken = token<string>()('broken');
		const disposed = mock(() => {});
		const Kept = token<string>()('kept');
		const deps = di(
			container()
				.provide(Kept, () => 'kept', { lifetime: 'scoped', dispose: disposed })
				.provide(
					Broken,
					() => {
						throw new Error('broken factory');
					},
					{ lifetime: 'scoped' },
				),
		);
		const app = new Hono()
			.use(deps)
			.get('/', deps.expose({ kept: Kept, broken: Broken }), (c) =>
				c.text('unreachable'),
			)
			.onError((error, c) => c.text(error.message, 500));

		const res = await app.request('/');

		expect(await res.text()).toBe('broken factory');
		expect(disposed).toHaveBeenCalledTimes(1);
	});
});

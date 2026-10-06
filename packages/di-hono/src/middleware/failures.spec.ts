import { describe, expect, mock, spyOn, test } from 'bun:test';
import { container, token } from '@nxgt/di';
import { Hono } from 'hono';
import { di } from './di';

const Tenant = token<string>()('tenant');

describe('di, when disposal fails', () => {
	const Fragile = token<string>()('fragile');
	const fragile = container().provide(Fragile, () => 'value', {
		lifetime: 'scoped',
		dispose: () => {
			throw new Error('cannot close');
		},
	});

	test('hands the error to onDisposeError and keeps the response', async () => {
		const onDisposeError = mock(() => {});
		const app = new Hono()
			.use(di(fragile, { onDisposeError }))
			.get('/', async (c) => c.text(await c.var.scope.resolve(Fragile)));

		const res = await app.request('/');

		expect(await res.text()).toBe('value');
		expect(onDisposeError).toHaveBeenCalledTimes(1);
	});

	test('keeps the handler error over the disposal error', async () => {
		const app = new Hono()
			.use(di(fragile, { onDisposeError: () => {} }))
			.get('/', async (c) => {
				await c.var.scope.resolve(Fragile);
				throw new Error('handler');
			})
			.onError((error, c) => c.text(error.message, 500));

		expect(await (await app.request('/')).text()).toBe('handler');
	});

	test('ignores an onDisposeError that throws', async () => {
		const app = new Hono()
			.use(
				di(fragile, {
					onDisposeError: () => {
						throw new Error('logger down');
					},
				}),
			)
			.get('/', async (c) => c.text(await c.var.scope.resolve(Fragile)));

		const res = await app.request('/');

		expect(res.status).toBe(200);
	});

	test('logs with console.error by default', async () => {
		const error = spyOn(console, 'error').mockImplementation(() => {});
		try {
			const app = new Hono()
				.use(di(fragile))
				.get('/', async (c) => c.text(await c.var.scope.resolve(Fragile)));

			await app.request('/');

			expect(error).toHaveBeenCalledTimes(1);
			expect(String(error.mock.calls[0]?.[0])).toContain('GET /');
		} finally {
			error.mockRestore();
		}
	});
});

describe('di, when the Scope cannot be made', () => {
	test('rejects every resolve with the Slot function error, and disposes of nothing', async () => {
		const onDisposeError = mock(() => {});
		const deps = di(container().slot(Tenant), {
			slots: () => {
				throw new Error('no tenant');
			},
			onDisposeError,
		});
		const errors: string[] = [];
		const app = new Hono().use(deps).get('/', async (c) => {
			for (const _ of [1, 2]) {
				await c.var.scope.resolve(Tenant).catch((e: Error) => {
					errors.push(e.message);
				});
			}
			return c.text('ok');
		});

		await app.request('/');

		expect(errors).toEqual(['no tenant', 'no tenant']);
		expect(onDisposeError).not.toHaveBeenCalled();
	});
});

import { describe, expect, test } from 'bun:test';
import { container } from '../container/container';
import {
	ContainerDisposedError,
	DisposeError,
	ScopeDisposedError,
	ScopeRequiredError,
} from '../errors/errors';
import { token } from '../token/token';

const Shared = token<{ n: number }>()('shared');
const PerScope = token<{ n: number }>()('perScope');
const Fresh = token<{ n: number }>()('fresh');

/** A Container whose Providers count what they make and log what they dispose. */
function counted(log: string[] = []) {
	let n = 0;
	const record = (name: string) => (value: { n: number }) =>
		void log.push(`${name}${value.n}`);
	return container()
		.provide(Shared, () => ({ n: ++n }), { dispose: record('shared') })
		.provide(PerScope, () => ({ n: ++n }), {
			lifetime: 'scoped',
			dispose: record('perScope'),
		})
		.provide(Fresh, () => ({ n: ++n }), {
			lifetime: 'transient',
			dispose: record('fresh'),
		});
}

describe('Scope', () => {
	test('makes a scoped value once per Scope', async () => {
		const app = counted();
		const a = app.createScope();
		const b = app.createScope();
		expect(await a.resolve(PerScope)).toBe(await a.resolve(PerScope));
		expect(await a.resolve(PerScope)).not.toBe(await b.resolve(PerScope));
	});

	test('shares the Container’s singletons', async () => {
		const app = counted();
		const scope = app.createScope();
		expect(await scope.resolve(Shared)).toBe(await app.resolve(Shared));
		expect(await app.createScope().resolve(Shared)).toBe(
			await scope.resolve(Shared),
		);
	});

	test('a scoped factory gets singletons and scoped values through get', async () => {
		const Both = token<string>()('both');
		const app = counted().provide(
			Both,
			async ({ get }) => `${(await get(Shared)).n}+${(await get(PerScope)).n}`,
			{ lifetime: 'scoped' },
		);
		expect(await app.createScope().resolve(Both)).toBe('1+2');
	});

	test('disposes of what it created, in reverse order, never a singleton', async () => {
		const log: string[] = [];
		const app = counted(log);
		const scope = app.createScope();
		await scope.resolve(Shared);
		await scope.resolve(PerScope);
		await scope.resolve(Fresh);
		await scope[Symbol.asyncDispose]();
		expect(log).toEqual(['fresh3', 'perScope2']);
		await app[Symbol.asyncDispose]();
		expect(log).toEqual(['fresh3', 'perScope2', 'shared1']);
	});

	test('a transient is owned by whoever resolved it', async () => {
		const log: string[] = [];
		const app = counted(log);
		await app.resolve(Fresh);
		const scope = app.createScope();
		await scope.resolve(Fresh);
		await scope[Symbol.asyncDispose]();
		expect(log).toEqual(['fresh2']);
		await app[Symbol.asyncDispose]();
		expect(log).toEqual(['fresh2', 'fresh1']);
	});

	test('disposing twice does nothing', async () => {
		const log: string[] = [];
		const scope = counted(log).createScope();
		await scope.resolve(PerScope);
		await Promise.all([
			scope[Symbol.asyncDispose](),
			scope[Symbol.asyncDispose](),
		]);
		await scope[Symbol.asyncDispose]();
		expect(log).toEqual(['perScope1']);
	});

	test('a resolve after disposal rejects, naming the Token', async () => {
		const scope = counted().createScope();
		await scope[Symbol.asyncDispose]();
		const error = await scope.resolve(Shared).catch((e) => e);
		expect(error).toBeInstanceOf(ScopeDisposedError);
		expect(error.message).toBe(
			"Cannot resolve Token 'shared': the Scope has been disposed",
		);
	});

	test('once the Container is disposed, a singleton rejects from its Scopes', async () => {
		const app = counted();
		const scope = app.createScope();
		await app[Symbol.asyncDispose]();
		await expect(scope.resolve(Shared)).rejects.toBeInstanceOf(
			ContainerDisposedError,
		);
	});

	test('createScope on a disposed Container throws', async () => {
		const app = counted();
		await app[Symbol.asyncDispose]();
		const error = (() => {
			try {
				app.createScope();
			} catch (e) {
				return e;
			}
			return undefined;
		})();
		expect(error).toBeInstanceOf(ContainerDisposedError);
		expect((error as ContainerDisposedError).token).toBeUndefined();
		expect((error as Error).message).toBe(
			'Cannot create a Scope: the Container has been disposed',
		);
	});

	test('disposing the Container leaves its live Scopes to their owners', async () => {
		const log: string[] = [];
		const app = counted(log);
		const scope = app.createScope();
		await scope.resolve(PerScope);
		await app[Symbol.asyncDispose]();
		expect(log).toEqual([]);
		await scope[Symbol.asyncDispose]();
		expect(log).toEqual(['perScope1']);
	});

	test('a failing dispose is reported as the Scope’s', async () => {
		const Bad = token<string>()('bad');
		const scope = container()
			.provide(Bad, () => 'b', {
				lifetime: 'scoped',
				dispose: () => {
					throw new Error('nope');
				},
			})
			.createScope();
		await scope.resolve(Bad);
		const error = await scope[Symbol.asyncDispose]().catch((e) => e);
		expect(error).toBeInstanceOf(DisposeError);
		expect(error.message).toBe(
			"Disposing the Scope failed for 1 value(s): 'bad'",
		);
	});

	test('a scoped factory that failed is tried again, and concurrent resolves share one run', async () => {
		let calls = 0;
		const Flaky = token<number>()('flaky');
		const scope = container()
			.provide(
				Flaky,
				async () => {
					await Promise.resolve();
					if (++calls === 1) throw new Error('down');
					return calls;
				},
				{ lifetime: 'scoped' },
			)
			.createScope();
		const [a, b] = await Promise.all([
			scope.resolve(Flaky).catch((e) => e),
			scope.resolve(Flaky).catch((e) => e),
		]);
		expect(b).toBe(a);
		expect(await scope.resolve(Flaky)).toBe(2);
		expect(calls).toBe(2);
	});

	test('resolve and dispose are bound', async () => {
		const { resolve, [Symbol.asyncDispose]: dispose } = counted().createScope();
		expect(await resolve(PerScope)).toEqual({ n: 1 });
		await dispose();
	});
});

describe('a scoped value without a Scope', () => {
	test('the Container refuses it', async () => {
		const app = counted();
		const error = await app.resolve(PerScope as never).catch((e) => e);
		expect(error).toBeInstanceOf(ScopeRequiredError);
		expect(error.message).toBe(
			"Token 'perScope' is scoped: resolve it from a Scope made by createScope",
		);
	});

	test('a singleton’s factory is refused it, even when resolved from a Scope', async () => {
		const Captive = token<string>()('captive');
		const app = counted().provide(Captive, async ({ get }) =>
			String(await get(PerScope as never)),
		);
		await expect(app.createScope().resolve(Captive)).rejects.toBeInstanceOf(
			ScopeRequiredError,
		);
	});
});

import { describe, expect, test } from 'bun:test';
import { container } from '../container/container';
import { ScopeDisposedError } from '../errors/errors';
import { token } from '../token/token';

const Late = token<string>()('late');

/** A promise and the function that settles it. */
function gate() {
	let open = () => {};
	const promise = new Promise<void>((resolve) => {
		open = resolve;
	});
	return { promise, open };
}

describe('Scope dispose, with factories still running', () => {
	test.each([
		['scoped', 'a scoped value'],
		['transient', 'a transient'],
	] as const)(
		'%s: %s that arrives after disposal began is disposed, and its resolve rejects',
		async (lifetime) => {
			const log: string[] = [];
			const { promise, open } = gate();
			const app = container().provide(
				Late,
				async () => {
					await promise;
					return lifetime;
				},
				{ lifetime, dispose: (value) => void log.push(value) },
			);
			const scope = app.createScope();
			const pending = scope.resolve(Late);
			const disposal = scope[Symbol.asyncDispose]();
			open();
			const error = await pending.catch((e) => e);
			expect(error).toBeInstanceOf(ScopeDisposedError);
			expect(error.token).toBe('late');
			await disposal;
			expect(log).toEqual([lifetime]);
			// The Container never owned it.
			log.length = 0;
			await app[Symbol.asyncDispose]();
			expect(log).toEqual([]);
		},
	);
});

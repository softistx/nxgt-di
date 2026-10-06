import { describe, expect, mock, test } from 'bun:test';
import { container, ScopeDisposedError, token } from '@nxgt/di';
import { LazyScope, type RuntimeScope } from './lazy-scope';

const Name = token<string>()('name');

function created(events: string[]): RuntimeScope {
	return container()
		.provide(Name, () => 'ada', {
			lifetime: 'scoped',
			dispose: () => void events.push('disposed'),
		})
		.createScope() as unknown as RuntimeScope;
}

describe('LazyScope', () => {
	test('creates the Scope on the first resolve only', async () => {
		const create = mock(async () => created([]));
		const scope = new LazyScope(create);
		expect(create).not.toHaveBeenCalled();

		await Promise.all([scope.resolve(Name), scope.resolve(Name)]);

		expect(create).toHaveBeenCalledTimes(1);
	});

	test('disposing of a Scope never created creates nothing', async () => {
		const create = mock(async () => created([]));
		const scope = new LazyScope(create);

		await scope[Symbol.asyncDispose]();

		expect(create).not.toHaveBeenCalled();
		await expect(scope.resolve(Name)).rejects.toBeInstanceOf(
			ScopeDisposedError,
		);
	});

	test('waits for a Scope still in creation, then disposes of it', async () => {
		const events: string[] = [];
		let release = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const scope = new LazyScope(async () => {
			await gate;
			return created(events);
		});
		const value = scope.resolve(Name);

		const disposal = scope[Symbol.asyncDispose]();
		release();
		await disposal;

		expect(await value).toBe('ada');
		expect(events).toEqual(['disposed']);
	});

	test('disposes once, however many calls', async () => {
		const events: string[] = [];
		const scope = new LazyScope(async () => created(events));
		await scope.resolve(Name);

		await Promise.all([
			scope[Symbol.asyncDispose](),
			scope[Symbol.asyncDispose](),
		]);
		await scope[Symbol.asyncDispose]();

		expect(events).toEqual(['disposed']);
	});
});

import { describe, expect, test } from 'bun:test';
import {
	DuplicateTokenNameError,
	TokenNotProvidedError,
} from '../errors/errors';
import { token } from '../token/token';
import { container } from './container';

const A = token<string>()('a');
const B = token<string>()('b');

describe('container', () => {
	test('provide returns a new Container and leaves the original as it was', async () => {
		const base = container().provide(A, () => 'a');
		const extended = base.provide(B, () => 'b');
		expect(extended).not.toBe(base);
		expect(await extended.resolve(B)).toBe('b');
		// A cast reaches what the types refuse: the original never learnt B.
		await expect(
			(base as unknown as typeof extended).resolve(B),
		).rejects.toBeInstanceOf(TokenNotProvidedError);
	});

	test('refuses at runtime a second Token with a name already provided', () => {
		const base = container().provide(A, () => 'a');
		const Other = token<string>()('a');
		expect(() => base.provide(Other as never, () => 'x')).toThrow(
			DuplicateTokenNameError,
		);
	});

	test('a Token of the same name but another identity is not provided', async () => {
		const app = container().provide(A, () => 'a');
		const error = await app.resolve(token<string>()('a')).catch((e) => e);
		expect(error).toBeInstanceOf(TokenNotProvidedError);
		expect(error.message).toBe("Token 'a' is not provided by this Container");
	});

	test('is AsyncDisposable, so `await using` takes it', async () => {
		const disposed: string[] = [];
		{
			await using app = container().provide(A, () => 'a', {
				dispose: (value) => {
					disposed.push(value);
				},
			});
			await app.resolve(A);
		}
		expect(disposed).toEqual(['a']);
	});
});

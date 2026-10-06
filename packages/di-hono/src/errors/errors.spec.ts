import { describe, expect, test } from 'bun:test';
import { DiError } from '@nxgt/di';
import { ScopeNotMountedError } from './errors';

describe('ScopeNotMountedError', () => {
	const error = new ScopeNotMountedError(['orders', 'me']);

	test('is a DiError with a stable code and no Token', () => {
		expect(error).toBeInstanceOf(DiError);
		expect(error.code).toBe('DI_SCOPE_NOT_MOUNTED');
		expect(error.name).toBe('ScopeNotMountedError');
		expect(error.token).toBeUndefined();
	});

	test('names the variables and the fix', () => {
		expect(error.variables).toEqual(['orders', 'me']);
		expect(error.message).toBe(
			"expose('orders', 'me') ran on a request with no Scope: mount its di() middleware first, with app.use(deps)",
		);
	});
});

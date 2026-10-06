import { describe, expect, test } from 'bun:test';
import {
	ContainerDisposedError,
	DiError,
	DisposeError,
	DuplicateTokenNameError,
	MissingSlotError,
	ModuleEscapedError,
	ScopeDisposedError,
	ScopeRequiredError,
	SlotOverrideError,
	TokenNotProvidedError,
} from './errors';

describe('errors', () => {
	test.each([
		[new TokenNotProvidedError('db'), 'DI_TOKEN_NOT_PROVIDED'],
		[new DuplicateTokenNameError('db'), 'DI_DUPLICATE_TOKEN_NAME'],
		[new ContainerDisposedError('db'), 'DI_CONTAINER_DISPOSED'],
		[new ScopeDisposedError('db'), 'DI_SCOPE_DISPOSED'],
		[new ScopeRequiredError('db'), 'DI_SCOPE_REQUIRED'],
		[new MissingSlotError(['db', 'tenant']), 'DI_SLOT_MISSING'],
		[new SlotOverrideError('db'), 'DI_SLOT_OVERRIDE'],
	] as const)('%p has a stable code and names its Token', (error, code) => {
		expect(error).toBeInstanceOf(DiError);
		expect(error).toBeInstanceOf(Error);
		expect(error.code).toBe(code);
		expect(error.name).toBe(error.constructor.name);
		expect(error.token).toBe('db');
		expect(error.message).toContain("'db'");
	});

	test('DisposeError aggregates every failure and names each Token', () => {
		const causes = [new Error('a'), new Error('b')];
		const error = new DisposeError(causes, ['cache', 'db']);
		expect(error).toBeInstanceOf(AggregateError);
		expect(error.code).toBe('DI_DISPOSE_FAILED');
		expect(error.name).toBe('DisposeError');
		expect(error.errors).toEqual(causes);
		expect(error.tokens).toEqual(['cache', 'db']);
		expect(error.message).toContain("'cache', 'db'");
	});

	test.each([
		[new ModuleEscapedError(), 'DI_MODULE_ESCAPED'],
		[new ContainerDisposedError(), 'DI_CONTAINER_DISPOSED'],
		[new ContainerDisposedError(undefined, 'init'), 'DI_CONTAINER_DISPOSED'],
	] as const)('%p concerns no Token', (error, code) => {
		expect(error).toBeInstanceOf(DiError);
		expect(error.code).toBe(code);
		expect(error.token).toBeUndefined();
	});
});

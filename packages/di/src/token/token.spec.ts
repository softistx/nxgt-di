import { describe, expect, test } from 'bun:test';
import { token } from './token';

describe('token', () => {
	test('carries its name, and a Symbol described by it as its identity', () => {
		const Db = token<{ url: string }>()('db');
		expect(Db.name).toBe('db');
		expect(typeof Db.id).toBe('symbol');
		expect(Db.id.description).toBe('db');
	});

	test('two Tokens with the same name are two identities', () => {
		expect(token<number>()('n').id).not.toBe(token<number>()('n').id);
	});

	test('is frozen', () => {
		expect(Object.isFrozen(token<number>()('n'))).toBe(true);
	});
});

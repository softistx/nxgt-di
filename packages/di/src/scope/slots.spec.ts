import { describe, expect, test } from 'bun:test';
import { container } from '../container/container';
import { MissingSlotError, ScopeRequiredError } from '../errors/errors';
import { token } from '../token/token';

interface User {
	readonly id: string;
	[Symbol.dispose]?(): void;
}
const Principal = token<User>()('principal');
const Tenant = token<string>()('tenant');
const Greeting = token<string>()('greeting');

const app = container()
	.slot(Principal)
	.slot(Tenant)
	.provide(
		Greeting,
		async ({ get }) => `${(await get(Principal)).id}@${await get(Tenant)}`,
		{ lifetime: 'scoped' },
	);

describe('Slots', () => {
	test('a Scope resolves each Slot to the value it was given', async () => {
		const user = { id: 'u1' };
		const scope = app.createScope({ principal: user, tenant: 't1' });
		expect(await scope.resolve(Principal)).toBe(user);
		expect(await scope.resolve(Greeting)).toBe('u1@t1');
	});

	test('each Scope has its own values', async () => {
		const a = app.createScope({ principal: { id: 'a' }, tenant: 't' });
		const b = app.createScope({ principal: { id: 'b' }, tenant: 't' });
		expect(await a.resolve(Greeting)).toBe('a@t');
		expect(await b.resolve(Greeting)).toBe('b@t');
	});

	test('createScope throws when a Slot is missing, naming every one', () => {
		const make = app.createScope as (slots?: object) => unknown;
		let error: unknown;
		try {
			make({ principal: { id: 'u' } });
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(MissingSlotError);
		expect((error as MissingSlotError).slots).toEqual(['tenant']);
		expect(() => make()).toThrow(
			"createScope was not given a value for Slot 'principal', 'tenant'",
		);
	});

	test('a Slot given undefined counts as given', async () => {
		const Optional = token<string | undefined>()('optional');
		const scope = container()
			.slot(Optional)
			.createScope({ optional: undefined });
		expect(await scope.resolve(Optional)).toBeUndefined();
	});

	test('a Slot’s value is never disposed by the Scope', async () => {
		let disposed = false;
		const user = {
			id: 'u',
			[Symbol.dispose]() {
				disposed = true;
			},
		};
		const scope = app.createScope({ principal: user, tenant: 't' });
		await scope.resolve(Principal);
		await scope[Symbol.asyncDispose]();
		expect(disposed).toBe(false);
	});

	test('the Container cannot resolve a Slot', async () => {
		await expect(app.resolve(Principal as never)).rejects.toBeInstanceOf(
			ScopeRequiredError,
		);
	});
});

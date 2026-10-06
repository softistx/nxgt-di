import { describe, expect, test } from 'bun:test';
import { container } from '../container/container';
import { SlotOverrideError, TokenNotProvidedError } from '../errors/errors';
import { token } from '../token/token';

interface Mailer {
	sent: string[];
	[Symbol.dispose](): void;
}
const Mail = token<Mailer>()('mail');
const Greeter = token<(name: string) => string>()('greeter');
const Principal = token<{ id: string }>()('principal');

function mailer(log: string[], name: string): Mailer {
	return {
		sent: [],
		[Symbol.dispose]: () => void log.push(`dispose ${name}`),
	};
}

function build(log: string[]) {
	return container()
		.provide(Mail, () => mailer(log, 'real'))
		.provide(Greeter, async ({ get }) => {
			const mail = await get(Mail);
			return (name: string) => {
				mail.sent.push(name);
				return `hello ${name}`;
			};
		});
}

describe('override', () => {
	test('a dependent gets the given value', async () => {
		const log: string[] = [];
		const fake = mailer(log, 'fake');
		const app = build(log).override(Mail, fake);
		(await app.resolve(Greeter))('ada');
		expect(fake.sent).toEqual(['ada']);
	});

	test('the original resolves exactly as before, sharing nothing', async () => {
		const log: string[] = [];
		const original = build(log);
		const before = await original.resolve(Mail);
		const fake = mailer(log, 'fake');
		const faked = original.override(Mail, fake);
		expect(await faked.resolve(Mail)).toBe(fake);
		expect(await original.resolve(Mail)).toBe(before);
		// Its singletons are its own: Greeter is made again in each.
		expect(await faked.resolve(Greeter)).not.toBe(
			await original.resolve(Greeter),
		);
		await faked[Symbol.asyncDispose]();
		expect(log).toEqual([]);
		await original[Symbol.asyncDispose]();
		expect(log).toEqual(['dispose real']);
	});

	test('the given value is not disposed: the caller owns it', async () => {
		const log: string[] = [];
		const app = build(log).override(Mail, mailer(log, 'fake'));
		await app.resolve(Greeter);
		await app[Symbol.asyncDispose]();
		expect(log).toEqual([]);
	});

	test('works whatever the lifetime, and keeps it', async () => {
		const Id = token<string>()('id');
		const Fresh = token<object>()('fresh');
		const value = {};
		const app = container()
			.provide(Id, () => 'real', { lifetime: 'scoped' })
			.provide(Fresh, () => ({}), { lifetime: 'transient' })
			.override(Id, 'fake')
			.override(Fresh, value);
		const scope = app.createScope();
		expect(await scope.resolve(Id)).toBe('fake');
		expect(await scope.resolve(Fresh)).toBe(value);
		await expect(app.resolve(Id as never)).rejects.toThrow('is scoped');
	});

	test('refuses at runtime a Token not provided, and a Slot', () => {
		const app = build([]).slot(Principal);
		expect(() =>
			app.override(token<string>()('missing') as never, 'x' as never),
		).toThrow(TokenNotProvidedError);
		expect(() =>
			app.override(Principal as never, { id: 'x' } as never),
		).toThrow(SlotOverrideError);
	});
});

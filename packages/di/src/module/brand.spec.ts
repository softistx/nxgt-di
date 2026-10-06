import { describe, expect, test } from 'bun:test';
import { container } from '../container/container';
import { ModuleEscapedError } from '../errors/errors';
import { defineModule } from './define-module';

describe('use', () => {
	test('refuses a Container faked from the prototype with ModuleEscapedError', () => {
		const app = container();
		const proto: object = Object.getPrototypeOf(app);
		const fake = defineModule()(() => Object.create(proto) as any);
		expect(() => app.use(fake)).toThrow(ModuleEscapedError);
	});
});

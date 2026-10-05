import { expect, test } from 'bun:test';
import { version } from './index';

test('the entry point loads', () => {
	expect(version).toBe('0.0.0');
});

/**
 * The errors `@nxgt/di-hono` throws. Each extends `@nxgt/di`'s `DiError` and
 * carries a stable `code`: match on it, or on the class, never on the message.
 */

import { DiError } from '@nxgt/di';

/**
 * An `expose` middleware ran on a request its `di` middleware was not
 * mounted on: `app.use(deps)` is missing, or comes after it. The types cannot
 * see the order middleware is registered in, so this is a runtime error.
 */
export class ScopeNotMountedError extends DiError {
	override readonly name = 'ScopeNotMountedError';
	declare readonly token: undefined;
	readonly code = 'DI_SCOPE_NOT_MOUNTED';
	/** The variable names the `expose` that threw was asked to set. */
	readonly variables: readonly string[];

	constructor(variables: readonly string[]) {
		super(
			undefined,
			`expose(${variables.map((v) => `'${v}'`).join(', ')}) ran on a request with no Scope: mount its di() middleware first, with app.use(deps)`,
		);
		this.variables = variables;
	}
}

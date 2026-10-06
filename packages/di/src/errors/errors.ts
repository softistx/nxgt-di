/**
 * The errors `@nxgt/di` throws. Each carries a stable `code`: match on it, or
 * on the class, never on the message.
 */

/** Every `code` an `@nxgt/di` error can carry. */
export type DiErrorCode =
	| 'DI_TOKEN_NOT_PROVIDED'
	| 'DI_DUPLICATE_TOKEN_NAME'
	| 'DI_CONTAINER_DISPOSED'
	| 'DI_SCOPE_DISPOSED'
	| 'DI_SCOPE_REQUIRED'
	| 'DI_SLOT_MISSING'
	| 'DI_SLOT_OVERRIDE'
	| 'DI_DISPOSE_FAILED';

/** The base of the errors that concern one Token. */
export abstract class DiError extends Error {
	abstract readonly code: DiErrorCode;
	/**
	 * The name of the Token the error is about; `undefined` only for a
	 * `ContainerDisposedError` from `createScope`, which concerns no Token.
	 */
	readonly token: string | undefined;

	constructor(token: string | undefined, message: string) {
		super(message);
		this.token = token;
	}
}

/**
 * A Token the Container has no Provider for. The types prevent it; it is
 * reached through a cast, or through another Token that has the same name.
 */
export class TokenNotProvidedError extends DiError {
	override readonly name = 'TokenNotProvidedError';
	declare readonly token: string;
	readonly code = 'DI_TOKEN_NOT_PROVIDED';

	constructor(token: string) {
		super(token, `Token '${token}' is not provided by this Container`);
	}
}

/**
 * A second Token whose name is already provided. The types prevent it; it is
 * reached through a cast, or a config loose enough to let it through.
 */
export class DuplicateTokenNameError extends DiError {
	override readonly name = 'DuplicateTokenNameError';
	declare readonly token: string;
	readonly code = 'DI_DUPLICATE_TOKEN_NAME';

	constructor(token: string) {
		super(
			token,
			`Token name '${token}' is already provided by this Container; Token names must be unique`,
		);
	}
}

/**
 * A resolve, or a `createScope`, on a Container whose disposal has begun.
 * `token` is the Token resolved, or `undefined` for `createScope`.
 */
export class ContainerDisposedError extends DiError {
	override readonly name = 'ContainerDisposedError';
	readonly code = 'DI_CONTAINER_DISPOSED';

	constructor(token?: string) {
		super(
			token,
			token === undefined
				? 'Cannot create a Scope: the Container has been disposed'
				: `Cannot resolve Token '${token}': the Container has been disposed`,
		);
	}
}

/** A resolve on a Scope whose disposal has begun. */
export class ScopeDisposedError extends DiError {
	override readonly name = 'ScopeDisposedError';
	declare readonly token: string;
	readonly code = 'DI_SCOPE_DISPOSED';

	constructor(token: string) {
		super(
			token,
			`Cannot resolve Token '${token}': the Scope has been disposed`,
		);
	}
}

/**
 * A scoped Token resolved where there is no Scope: from the Container, or from
 * a singleton's factory. The types prevent it; it is reached through a cast.
 */
export class ScopeRequiredError extends DiError {
	override readonly name = 'ScopeRequiredError';
	declare readonly token: string;
	readonly code = 'DI_SCOPE_REQUIRED';

	constructor(token: string) {
		super(
			token,
			`Token '${token}' is scoped: resolve it from a Scope made by createScope`,
		);
	}
}

/**
 * `createScope` was not given a value for every Slot. The types prevent it;
 * it is reached from JavaScript, or through a cast. `token` is the first
 * missing Slot, `slots` all of them.
 */
export class MissingSlotError extends DiError {
	override readonly name = 'MissingSlotError';
	declare readonly token: string;
	readonly code = 'DI_SLOT_MISSING';
	readonly slots: readonly string[];

	constructor(slots: readonly [string, ...string[]]) {
		super(
			slots[0],
			`createScope was not given a value for Slot ${slots.map((s) => `'${s}'`).join(', ')}`,
		);
		this.slots = slots;
	}
}

/**
 * `override` was given a Slot. The types prevent it; it is reached from
 * JavaScript, or through a cast.
 */
export class SlotOverrideError extends DiError {
	override readonly name = 'SlotOverrideError';
	declare readonly token: string;
	readonly code = 'DI_SLOT_OVERRIDE';

	constructor(token: string) {
		super(
			token,
			`Token '${token}' is a Slot: pass its value to createScope instead`,
		);
	}
}

/**
 * One or more values failed to dispose. Every other value was still disposed;
 * `errors` holds what each failing dispose threw, and `tokens` the names of
 * their Tokens, in the order they were disposed.
 */
export class DisposeError extends AggregateError {
	override readonly name = 'DisposeError';
	readonly code = 'DI_DISPOSE_FAILED';
	readonly tokens: readonly string[];

	constructor(
		errors: readonly unknown[],
		tokens: readonly string[],
		owner: 'Container' | 'Scope' = 'Container',
	) {
		super(
			errors,
			`Disposing the ${owner} failed for ${tokens.length} value(s): ${tokens.map((t) => `'${t}'`).join(', ')}`,
		);
		this.tokens = tokens;
	}
}

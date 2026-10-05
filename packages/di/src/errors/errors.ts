/**
 * The errors `@nxgt/di` throws. Each carries a stable `code`: match on it, or
 * on the class, never on the message.
 */

/** Every `code` an `@nxgt/di` error can carry. */
export type DiErrorCode =
	| 'DI_TOKEN_NOT_PROVIDED'
	| 'DI_DUPLICATE_TOKEN_NAME'
	| 'DI_CONTAINER_DISPOSED'
	| 'DI_DISPOSE_FAILED';

/** The base of the errors that concern one Token. */
export abstract class DiError extends Error {
	abstract readonly code: DiErrorCode;
	/** The name of the Token the error is about. */
	readonly token: string;

	constructor(token: string, message: string) {
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
	readonly code = 'DI_DUPLICATE_TOKEN_NAME';

	constructor(token: string) {
		super(
			token,
			`Token name '${token}' is already provided by this Container; Token names must be unique`,
		);
	}
}

/** A resolve on a Container whose disposal has begun. */
export class ContainerDisposedError extends DiError {
	override readonly name = 'ContainerDisposedError';
	readonly code = 'DI_CONTAINER_DISPOSED';

	constructor(token: string) {
		super(
			token,
			`Cannot resolve Token '${token}': the Container has been disposed`,
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

	constructor(errors: readonly unknown[], tokens: readonly string[]) {
		super(
			errors,
			`Disposing the Container failed for ${tokens.length} value(s): ${tokens.map((t) => `'${t}'`).join(', ')}`,
		);
		this.tokens = tokens;
	}
}

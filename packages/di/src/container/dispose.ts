import { DisposeError } from '../errors/errors';
import type { Created, Owner } from './state';

/**
 * How one created value is disposed of: the Provider's `dispose` if it names
 * one, else the value's `Symbol.asyncDispose`, else its `Symbol.dispose`,
 * else nothing.
 */
export function disposerOf({
	provider,
	value,
}: Created): (() => unknown) | undefined {
	if (provider.dispose) return () => provider.dispose?.(value);
	if ((typeof value !== 'object' && typeof value !== 'function') || !value)
		return undefined;
	const disposable = value as Partial<AsyncDisposable & Disposable>;
	const asyncDispose = disposable[Symbol.asyncDispose];
	if (typeof asyncDispose === 'function') return () => asyncDispose.call(value);
	const dispose = disposable[Symbol.dispose];
	if (typeof dispose === 'function') return () => dispose.call(value);
	return undefined;
}

/**
 * Disposes of a Container or a Scope: waits for the factories still running, then
 * disposes of every created value in reverse creation order, transients
 * included. One failing dispose does not stop the others; once all have run,
 * the failures are thrown together as a `DisposeError`.
 */
export async function disposeAll(state: Owner): Promise<void> {
	await Promise.allSettled(state.pending);
	const errors: unknown[] = [];
	const tokens: string[] = [];
	for (let i = state.created.length - 1; i >= 0; i--) {
		const created = state.created[i];
		if (!created) continue;
		const dispose = disposerOf(created);
		if (!dispose) continue;
		try {
			await dispose();
		} catch (error) {
			errors.push(error);
			tokens.push(created.provider.token.name);
		}
	}
	state.created.length = 0;
	state.cache.clear();
	if (errors.length > 0) throw new DisposeError(errors, tokens, state.kind);
}

/**
 * A Container's or a Scope's `[Symbol.asyncDispose]`. The first call disposes; any later
 * call waits for that disposal and resolves, without rethrowing what the
 * first call already reported.
 */
export function disposeOnce(state: Owner): Promise<void> {
	if (state.disposal) return state.disposal.then(noop, noop);
	// Assigned before the first await inside: a value whose factory settles
	// from here on sees disposal has begun.
	state.disposal = Promise.resolve().then(() => disposeAll(state));
	return state.disposal;
}

function noop(): void {}

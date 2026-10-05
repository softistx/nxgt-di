import type { AnyToken } from '../token/token';
import { disposeOnce } from './dispose';
import { addProvider, type Provider, type Providers } from './provide';
import { resolveToken } from './resolve';
import { createState, type State } from './state';
import type { Container, NoTokens, ProvideOptions } from './types';

/**
 * The runtime behind every Container. Its types are erased: `Container<P>`
 * is what callers see, and it is what keeps them honest.
 */
class DiContainer {
	readonly #state: State;

	constructor(providers: Providers) {
		this.#state = createState(providers);
	}

	provide(
		token: AnyToken,
		factory: Provider['factory'],
		options: ProvideOptions<unknown> = {},
	): DiContainer {
		const provider: Provider = {
			token,
			factory,
			lifetime: options.lifetime ?? 'singleton',
			dispose: options.dispose,
		};
		return new DiContainer(addProvider(this.#state.providers, provider));
	}

	resolve(token: AnyToken): Promise<unknown> {
		return resolveToken(this.#state, token);
	}

	[Symbol.asyncDispose](): Promise<void> {
		return disposeOnce(this.#state);
	}
}

/**
 * An empty Container. Add Providers with `provide`, in dependency order: each
 * call returns a new Container whose type lists one more Token.
 */
export function container(): Container<NoTokens> {
	return new DiContainer(new Map()) as unknown as Container<NoTokens>;
}

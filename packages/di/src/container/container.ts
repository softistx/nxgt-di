import { ContainerDisposedError, MissingSlotError } from '../errors/errors';
import type { Lifetime } from '../lifetime/lifetime';
import { overrideProvider } from '../override/override';
import { DiScope } from '../scope/scope';
import type { AnyToken } from '../token/token';
import { disposeOnce } from './dispose';
import { initSingletons } from './init';
import { addProvider, type Provider, type Providers } from './provide';
import { resolveToken } from './resolve';
import { createState, type State } from './state';
import type { Container, NoTokens } from './types';

/**
 * The runtime behind every Container. Its types are erased: `Container<P>`
 * is what callers see, and it is what keeps them honest.
 */
class DiContainer {
	readonly #state: State;

	constructor(providers: Providers) {
		this.#state = createState(providers);
	}

	// Arrow properties, not methods: `const { resolve } = app` keeps working.

	readonly provide = (
		token: AnyToken,
		factory: Provider['factory'],
		options: {
			lifetime?: Lifetime | undefined;
			dispose?: Provider['dispose'];
		} = {},
	): DiContainer => {
		const provider: Provider = {
			token,
			factory,
			lifetime: options.lifetime ?? 'singleton',
			slot: false,
			dispose: options.dispose,
			owned: true,
		};
		return new DiContainer(addProvider(this.#state.providers, provider));
	};

	readonly slot = (token: AnyToken): DiContainer => {
		const provider: Provider = {
			token,
			// Never run: a Scope is given every Slot's value when it is made.
			factory: () => {
				throw new MissingSlotError([token.name]);
			},
			lifetime: 'scoped',
			slot: true,
			dispose: undefined,
			owned: false,
		};
		return new DiContainer(addProvider(this.#state.providers, provider));
	};

	readonly createScope = (
		slots: Readonly<Record<string, unknown>> = {},
	): DiScope => {
		if (this.#state.disposal) throw new ContainerDisposedError();
		return new DiScope(this.#state, slots);
	};

	readonly use = (module: { build: (container: DiContainer) => unknown }) =>
		module.build(this);

	readonly override = (token: AnyToken, value: unknown): DiContainer =>
		new DiContainer(overrideProvider(this.#state.providers, token, value));

	readonly init = (): Promise<void> => initSingletons(this.#state);

	readonly resolve = (token: AnyToken): Promise<unknown> =>
		resolveToken(this.#state, undefined, token);

	readonly [Symbol.asyncDispose] = (): Promise<void> =>
		disposeOnce(this.#state);
}

/**
 * An empty Container. Add Providers with `provide`, in dependency order: each
 * call returns a new Container whose type lists one more Token.
 */
export function container(): Container<NoTokens> {
	return new DiContainer(new Map()) as unknown as Container<NoTokens>;
}

import type {
	AnyToken,
	NoTokens,
	Scope,
	ScopeResolvable,
	TokenValue,
} from '@nxgt/di';
import type { Context, MiddlewareHandler } from 'hono';

/** Carries a `Di`'s Scope type. Type-only: no middleware has it at runtime. */
declare const scopeType: unique symbol;

/** The variable `di` sets: the request's Scope. */
export type ScopeVariables<Singletons, Scoped> = {
	/** The request's Scope, created on its first `resolve`. */
	scope: Scope<Singletons, Scoped>;
};

/** A Slot value for each of the Container's Slots, keyed by Token name. */
export type SlotsFn<Slots> = (
	c: Context,
) => Readonly<Slots> | PromiseLike<Readonly<Slots>>;

/** What every `di` call takes, Slots or not. */
interface CommonOptions {
	/**
	 * Called when disposing of a request's Scope fails, after the response is
	 * decided: the error never replaces the handler's error or response.
	 * Defaults to `console.error`. What it throws is ignored.
	 */
	onDisposeError?: (error: unknown, c: Context) => void;
}

/**
 * `di`'s options. `slots` is required exactly when the Container has Slots,
 * and refused when it has none.
 */
export type DiOptions<Slots> = [keyof Slots] extends [never]
	? CommonOptions & { slots?: never }
	: CommonOptions & {
			/**
			 * Computes the request's Slot values, from its Context. Called once,
			 * when the Scope is first resolved from: never on a request that
			 * resolves nothing.
			 */
			slots: SlotsFn<Slots>;
		};

/** `di`'s parameters: the options are optional when there is no Slot. */
export type DiArgs<Slots> = [keyof Slots] extends [never]
	? [options?: DiOptions<Slots>]
	: [options: DiOptions<Slots>];

/**
 * `unknown` when `expose` may take `Tokens`, else a refusal: every Token must
 * be one a Scope of the Container resolves, and no key may be `scope`, the
 * Scope's own variable.
 */
export type Exposable<Tokens, Singletons, Scoped> = {
	[K in keyof Tokens]: ScopeResolvable<Tokens[K], Singletons, Scoped>;
} & ('scope' extends keyof Tokens
	? {
			readonly "'scope' is the Scope's own variable: expose under another name": never;
		}
	: unknown);

/** The variables `expose(tokens)` sets: each key, typed by its Token. */
export type Exposed<Tokens> = { [K in keyof Tokens]: TokenValue<Tokens[K]> };

/**
 * The middleware `di` returns: mount it with `app.use(deps)`. It sets
 * `c.var.scope`, and `expose` builds the middleware that sets resolved values
 * on `c.var`.
 */
export interface Di<Singletons, Scoped>
	extends MiddlewareHandler<{
		Variables: ScopeVariables<Singletons, Scoped>;
	}> {
	/** Type-only, absent at runtime: the Scope type, for `DiEnv`. */
	readonly [scopeType]?: Scope<Singletons, Scoped>;

	/**
	 * A middleware that resolves each Token in the request's Scope and sets it
	 * on `c.var` under its key. Each Token must be one a Scope of this
	 * Container resolves: a singleton, a scoped Provider or a Slot. It throws
	 * `ScopeNotMountedError` on a request this `di` middleware is not mounted
	 * on, which the types cannot see.
	 */
	expose<const Tokens extends Readonly<Record<string, AnyToken>>>(
		tokens: Tokens & Exposable<Tokens, Singletons, Scoped>,
	): MiddlewareHandler<{ Variables: Exposed<Tokens> }>;
}

/**
 * The `Env` of an app whose every route sees `c.var.scope`, and the
 * variables of the `expose` maps given, for an app declared as
 * `new Hono<DiEnv<typeof deps, typeof exposed>>()` rather than chained. It
 * claims the variables on every route: mount the `expose` that sets them
 * where they are read.
 */
export type DiEnv<D extends AnyDi, Tokens = NoTokens> = {
	Variables: { scope: NonNullable<D[typeof scopeType]> } & Exposed<Tokens>;
};

/** Any `di` middleware, whatever its Container. */
export type AnyDi = Di<any, any>;

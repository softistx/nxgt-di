/**
 * How long a resolved value lives: `singleton`, once per Container; `scoped`,
 * once per Scope; `transient`, new on every resolve.
 */
export type Lifetime = 'singleton' | 'scoped' | 'transient';

/**
 * The longest Lifetime a transient may be captured by, which it declares:
 * bound to `singleton` (the default) it may be used by a singleton and sees
 * only singletons; bound to `scoped` it sees scoped values too, and counts as
 * scoped.
 */
export type Bound = 'singleton' | 'scoped';

/**
 * The lifetime `L` stands for at runtime, where a missing or `undefined`
 * lifetime means singleton: `undefined` alone is `singleton`, and a union
 * holding `undefined` holds `singleton` too.
 */
export type Effective<L extends Lifetime | undefined> =
	| Exclude<L, undefined>
	| (undefined extends L ? 'singleton' : never);

/**
 * What an entry counts as for the captive check: `singleton` only when it is
 * surely one (a singleton, or a transient bound to singleton), else `scoped`.
 * Not distributive, so a lifetime typed as a union counts as scoped: the side
 * on which nothing can capture it.
 */
export type CountsAs<L extends Lifetime | undefined, B extends Bound> = [
	Effective<L>,
] extends ['singleton']
	? 'singleton'
	: [Effective<L>] extends ['transient']
		? [B] extends ['singleton']
			? 'singleton'
			: 'scoped'
		: 'scoped';

/**
 * What a factory may see: scoped values only when it is surely scoped (a
 * scoped Provider, or a transient bound to scoped), else only singletons. The
 * other conservative side of `CountsAs`.
 */
export type Sees<L extends Lifetime | undefined, B extends Bound> = [
	Effective<L>,
] extends ['scoped']
	? 'scoped'
	: [Effective<L>] extends ['transient']
		? [B] extends ['scoped']
			? 'scoped'
			: 'singleton'
		: 'singleton';

/** The options of `provide`. */
export type ProvideOptions<
	T,
	L extends Lifetime | undefined = Lifetime,
	B extends Bound = Bound,
> = ([Effective<L>] extends ['singleton']
	? {
			/** `singleton` (the default), `scoped` or `transient`. */
			readonly lifetime?: L;
		}
	: {
			/**
			 * Required for any other lifetime than singleton, so the runtime,
			 * which reads it, agrees with the types, which may have been given
			 * `L` explicitly. `L` may hold `undefined` (from a variable typed
			 * `Lifetime | undefined`): that means singleton, and the union
			 * counts as scoped and sees singletons only, as any union does.
			 */
			// NoInfer: `L` is inferred from the branch above only. A required
			// property, so `{ lifetime?: 'transient' }` is refused: it may be
			// left out, which the runtime reads as singleton.
			// `undefined` only when `L` already holds singleton: under a config
			// without exactOptionalPropertyTypes, inference drops the
			// `undefined` of a `Lifetime | undefined` variable.
			readonly lifetime: NoInfer<
				'singleton' extends Effective<L> ? L | undefined : L
			>;
		}) & {
	/**
	 * Disposes of the value. Without it, the value's `Symbol.asyncDispose` is
	 * called, failing that its `Symbol.dispose`, failing that nothing.
	 */
	readonly dispose?: ((value: T) => void | PromiseLike<void>) | undefined;
} & ([Effective<L>] extends ['transient']
		? {
				/** The longest Lifetime that may capture this transient. */
				readonly bound?: B | undefined;
			}
		: {
				readonly bound?:
					| { readonly 'bound is only allowed with lifetime transient': never }
					| undefined;
			});

/** True when `A` and `B` are the same type, not merely assignable. */
export type Equal<A, B> =
	(<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2
		? true
		: false;

/** Compiles only when `T` is `true`. */
export type Expect<T extends true> = T;

/** `true` when `T` is a union of two or more members. */
export type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;

type UnionToIntersection<T> = (
	T extends unknown
		? (x: T) => void
		: never
) extends (x: infer I) => void
	? I
	: never;

/**
 * `true` when `N` is exactly one string literal: not `string`, not a template
 * pattern such as `` `db-${string}` ``, not a union, not `never`. Only such a
 * name can key a Container's type. A key that `Record` turns into an index
 * signature (`string`, a pattern) leaves `{}` assignable to it; a literal key
 * makes a required property, which `{}` lacks.
 */
export type IsLiteralName<N> = [N] extends [never]
	? false
	: Record<never, never> extends Record<N & string, 1>
		? false
		: IsUnion<N> extends true
			? false
			: true;

/**
 * `unknown` for a name that can key a Container's type, else a refusal. The
 * refusal is written inline, not named, so the compiler prints its text.
 */
export type LiteralName<N> =
	IsLiteralName<N> extends true
		? unknown
		: { readonly 'a Token name must be exactly one string literal': never };

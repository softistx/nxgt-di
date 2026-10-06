import type {
	ContainerDisposedError,
	DiError,
	MissingSlotError,
	ScopeDisposedError,
	ScopeRequiredError,
	TokenNotProvidedError,
} from '../../src/index';
import type { Equal, Expect } from './assert';

// Every error names its Token, except a ContainerDisposedError from
// createScope, which concerns none.
export type Named = Expect<
	Equal<
		| TokenNotProvidedError['token']
		| ScopeDisposedError['token']
		| ScopeRequiredError['token']
		| MissingSlotError['token'],
		string
	>
>;
export type Maybe = Expect<
	Equal<ContainerDisposedError['token'], string | undefined>
>;
export type Base = Expect<Equal<DiError['token'], string | undefined>>;

declare const disposed: ContainerDisposedError;
// @ts-expect-error a ContainerDisposedError may concern no Token
export const notAlways: string = disposed.token;
// probe: the others always do.
declare const missing: TokenNotProvidedError;
export const always: string = missing.token;

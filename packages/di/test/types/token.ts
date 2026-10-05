import { type Token, type TokenValue, token } from '../../src/index';
import type { Equal, Expect } from './assert';
import type { Db } from './fixtures';

const Database = token<Db>()('db');

// The name is a literal type: it is the Token's key in a Container's type.
export type NameIsLiteral = Expect<Equal<typeof Database, Token<'db', Db>>>;
export type NameProperty = Expect<Equal<(typeof Database)['name'], 'db'>>;
export type ValueType = Expect<Equal<TokenValue<typeof Database>, Db>>;

// A name widened to `string` could not key anything, so it is refused.
declare const someName: string;
// @ts-expect-error a Token name must be a string literal
token<Db>()(someName);
// probe: a literal compiles, and so does a `const` holding one.
const literal = 'database';
export const fromConst: Token<'database', Db> = token<Db>()(literal);

// The value type is invariant: neither direction is assignable.
// @ts-expect-error Token<'db', Db> is not a Token<'db', Db | null>
export const widened: Token<'db', Db | null> = Database;
// probe: the exact type is.
export const exact: Token<'db', Db> = Database;

// The name is part of the type: same value type, different name, different Token.
// @ts-expect-error Token<'db', Db> is not a Token<'other', Db>
export const renamed: Token<'other', Db> = Database;
// probe: the same name is.
export const sameName: Token<'db', Db> = token<Db>()('db');

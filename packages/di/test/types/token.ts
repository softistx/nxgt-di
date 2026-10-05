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
// @ts-expect-error a Token name must be exactly one string literal
token<Db>()(someName);
// probe: a literal compiles, and so does a `const` holding one.
const literal = 'database';
export const fromConst: Token<'database', Db> = token<Db>()(literal);

// Nor is a union of names: it would key two entries with one Token.
declare const primary: boolean;
// @ts-expect-error a Token name must be exactly one string literal
token<Db>()(primary ? 'primary' : 'replica');
// probe: one literal compiles.
export const primaryDb: Token<'primary', Db> = token<Db>()('primary');

// Nor is a template pattern, which would key every name it matches.
declare const suffix: string;
// @ts-expect-error a Token name must be exactly one string literal
token<Db>()(`db-${suffix}` as `db-${string}`);
// probe: a template whose parts are literals is one literal, and compiles.
const part = 'main';
export const templated: Token<'db-main', Db> = token<Db>()(`db-${part}`);

// The value type is invariant: neither direction is assignable.
// @ts-expect-error widening: Token<'db', Db> is not a Token<'db', Db | null>
export const widened: Token<'db', Db | null> = Database;
const Nullable = token<Db | null>()('db');
// @ts-expect-error narrowing: Token<'db', Db | null> is not a Token<'db', Db>
export const narrowed: Token<'db', Db> = Nullable;
// probe: the exact type is, both ways round.
export const exact: Token<'db', Db> = Database;
export const exactNullable: Token<'db', Db | null> = Nullable;

// The name is part of the type: same value type, different name, different Token.
// @ts-expect-error Token<'db', Db> is not a Token<'other', Db>
export const renamed: Token<'other', Db> = Database;
// probe: the same name is.
export const sameName: Token<'db', Db> = token<Db>()('db');

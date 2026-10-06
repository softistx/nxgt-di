import { container, type Scope, token } from '../../src/index';
import type { Equal, Expect } from './assert';
import type { Config, Db } from './fixtures';

const Settings = token<Config>()('config');
const Database = token<Db>()('db');
const RequestId = token<string>()('requestId');

declare const db: Db;

const app = container()
	.provide(Settings, () => ({ url: 'x' }))
	.provide(RequestId, () => 'r', { lifetime: 'scoped' })
	.provide(Database, () => db, { lifetime: 'transient', bound: 'scoped' });
const scope = app.createScope();

export type Typed = Expect<
	Equal<typeof scope, Scope<{ config: Config }, { requestId: string; db: Db }>>
>;

// A Scope resolves everything, always as a Promise.
const s = scope.resolve(Settings);
const r = scope.resolve(RequestId);
const d = scope.resolve(Database);
export type Singleton = Expect<Equal<typeof s, Promise<Config>>>;
export type Scoped = Expect<Equal<typeof r, Promise<string>>>;
export type Transient = Expect<Equal<typeof d, Promise<Db>>>;

// ...but not what the Container lacks, nor a union.
// @ts-expect-error Token 'cache' is not provided
scope.resolve(token<string>()('cache'));
declare const either: boolean;
// @ts-expect-error resolve one Token at a time
scope.resolve(either ? Settings : RequestId);
// probe: one provided Token at a time compiles.
scope.resolve(RequestId);

// It is AsyncDisposable, and its methods are bound.
export const disposable: AsyncDisposable = scope;
const { resolve } = scope;
resolve(RequestId);

// Scopes of different Containers are not interchangeable.
const other = container()
	.provide(Settings, () => ({ url: 'x' }))
	.createScope();
// @ts-expect-error this Scope has no 'requestId'
export const wrong: typeof scope = other;
// probe: a Scope of the same Container type is.
export const same: typeof scope = app.createScope();

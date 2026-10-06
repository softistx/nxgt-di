import {
	container,
	type Factory,
	type NoTokens,
	type Resolver,
	token,
} from '../../src/index';
import type { Config } from './fixtures';

const Settings = token<Config>()('config');
const RequestId = token<string>()('requestId');
const Length = token<number>()('length');
const Later = token<number>()('later');

type Singletons = { config: Config };
type Scoped = { requestId: string };

const base = container()
	.provide(Settings, () => ({ url: 'x' }))
	.provide(RequestId, () => 'r', { lifetime: 'scoped' });

// A factory annotated to see more than it is given is refused: a scoped
// Token from a singleton...
base.provide(
	Length,
	// @ts-expect-error a singleton's factory is not given the scoped 'requestId'
	async (r: Resolver<Singletons, Scoped>) => (await r.get(RequestId)).length,
);
// probe: ...which a scoped Provider is given.
base.provide(
	Length,
	async (r: Resolver<Singletons, Scoped>) => (await r.get(RequestId)).length,
	{ lifetime: 'scoped' },
);

// The same through a Factory declared apart.
const wide: Factory<Singletons, Scoped, number> = async ({ get }) =>
	(await get(RequestId)).length;
// @ts-expect-error a singleton's factory is not given the scoped 'requestId'
base.provide(Length, wide, { lifetime: 'singleton' });
// probe: a scoped Provider takes it.
base.provide(Length, wide, { lifetime: 'scoped' });

// ...or a Token provided after it: a cycle, written through an annotation.
container().provide(
	Length,
	// @ts-expect-error 'later' is not provided before 'length'
	(r: Resolver<{ later: number }>) => r.get(Later),
);
// probe: in order, it compiles.
container()
	.provide(Later, () => 1)
	.provide(Length, (r: Resolver<{ later: number }>) => r.get(Later));

// A reusable factory typed with fewer Tokens fits a bigger Container, at
// any lifetime: a Resolver that sees more stands in for one that sees less.
const narrow: Factory<{ config: Config }, NoTokens, number> = async ({ get }) =>
	(await get(Settings)).url.length;
base.provide(Length, narrow);
base.provide(Length, narrow, { lifetime: 'scoped' });
base.provide(Length, narrow, { lifetime: 'transient' });
base.provide(
	Length,
	async (r: Resolver<{ config: Config }>) => (await r.get(Settings)).url.length,
);
// @ts-expect-error but not one that needs a Token this Container lacks
container().provide(Length, narrow);

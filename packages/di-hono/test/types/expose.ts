/**
 * Type tests for `expose` and `DiEnv`. Checked by `bun run typecheck`, never
 * run.
 */

import { Hono } from 'hono';
import { type DiEnv, di } from '../../src/index';
import type { Equal } from './assert';
import {
	AuditT,
	type Db,
	DbT,
	type Orders,
	OrdersT,
	type Principal,
	PrincipalT,
	Unprovided,
	withoutSlots,
	withSlots,
} from './fixtures';

declare const principal: Principal;
const deps = di(withSlots, { slots: () => ({ principal }) });

// A singleton, a scoped Provider, a Slot and a transient: all a Scope resolves.
const exposed = { db: DbT, orders: OrdersT, user: PrincipalT, audit: AuditT };
const all = deps.expose(exposed);

// @ts-expect-error — `unprovided` is a Token this Container does not provide
void deps.expose({ db: DbT, n: Unprovided });

// @ts-expect-error — `scope` is the Scope's own variable
void deps.expose({ scope: DbT });

// @ts-expect-error — a value that is not a Token
void deps.expose({ db: 'db' });

// Mounted on a path, the handlers after it see each value under its key.
new Hono()
	.use(deps)
	.use('/orders/*', all)
	.get('/orders', (c) => {
		const typed: Equal<
			[
				typeof c.var.db,
				typeof c.var.orders,
				typeof c.var.user,
				typeof c.var.audit,
			],
			[Db, Orders, Principal, string[]]
		> = true;
		void typed;
		// @ts-expect-error — `orders` is an Orders, not a string
		const wrong: string = c.var.orders;
		void wrong;
		return c.text('ok');
	});

// On one route, between the path and the handler.
new Hono()
	.use(deps)
	.get('/me', deps.expose({ me: PrincipalT }), (c) =>
		c.json({ id: c.var.me.id }),
	);

// Declared rather than chained, `DiEnv` types the app from the same values.
const app = new Hono<DiEnv<typeof deps, typeof exposed>>();
app.use(deps);
app.use('/orders/*', all);
app.get('/orders', async (c) => {
	const list: string[] = await c.var.orders.list();
	const fromScope: Db = await c.var.scope.resolve(DbT);
	void [list, fromScope];
	// @ts-expect-error — not exposed, so not on `c.var`
	void c.var.tenant;
	return c.text('ok');
});

// `DiEnv` with no map: only the Scope.
const bare = new Hono<DiEnv<typeof deps>>();
bare.get('/', async (c) => {
	const user: Principal = await c.var.scope.resolve(PrincipalT);
	void user;
	// @ts-expect-error — `orders` was not exposed in this Env
	void c.var.orders;
	return c.text('ok');
});

// Each `expose` is checked against its own `di`'s Container.
// @ts-expect-error — the Container behind this `di` provides no `orders`
void di(withoutSlots).expose({ orders: OrdersT });

/**
 * Type tests for `di`'s options. Checked by `bun run typecheck`, never run.
 */

import type { Scope } from '@nxgt/di';
import { Hono } from 'hono';
import { di } from '../../src/index';
import type { Equal } from './assert';
import {
	type Db,
	DbT,
	type Orders,
	OrdersT,
	type Principal,
	PrincipalT,
	withoutSlots,
	withSlots,
} from './fixtures';

declare const principal: Principal;

// With Slots, `slots` computes them, sync or async, from the Context.
const deps = di(withSlots, { slots: () => ({ principal }) });
void di(withSlots, {
	slots: async (c) => ({ principal: { id: c.req.header('x-user') ?? '' } }),
});

// @ts-expect-error — the Container has a Slot, so `slots` is required
void di(withSlots);

// @ts-expect-error — `slots` must give every Slot: `principal` is missing
void di(withSlots, { slots: () => ({}) });

// @ts-expect-error — a Slot's value has its Token's type
void di(withSlots, { slots: () => ({ principal: 'ada' }) });

// @ts-expect-error — `onDisposeError` alone leaves the Slot unfilled
void di(withSlots, { onDisposeError: () => {} });

// Without Slots, the options are optional, and `slots` is refused.
const plain = di(withoutSlots);
void di(withoutSlots, {
	onDisposeError: (error, c) => void [error, c.req.path],
});

// @ts-expect-error — no Slot to fill: `slots` would never be read
void di(withoutSlots, { slots: () => ({}) });

// Chained, the app's handlers see `c.var.scope`, typed by the Container.
new Hono().use(deps).get('/', async (c) => {
	const typed: Equal<
		typeof c.var.scope,
		Scope<{ db: Db }, { principal: Principal; orders: Orders; audit: string[] }>
	> = true;
	void typed;
	const orders = await c.var.scope.resolve(OrdersT);
	const db = await c.get('scope').resolve(DbT);
	void [orders, db];
	return c.text('ok');
});

new Hono().use(plain).get('/', async (c) => {
	await c.var.scope.resolve(DbT);
	// @ts-expect-error — this Container has no Slot named `principal`
	await c.var.scope.resolve(PrincipalT);
	return c.text('ok');
});

// A path, as `app.use` takes one.
new Hono().use('/api/*', deps);

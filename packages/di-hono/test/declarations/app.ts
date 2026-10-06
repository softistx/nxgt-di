// An app's exported middleware and routes, whose types are inferred: a
// declaration build must be able to name each through `@nxgt/di-hono`,
// `@nxgt/di` and `hono` alone (TS2883 otherwise).
import { container, token } from '@nxgt/di';
import { type DiEnv, di } from '@nxgt/di-hono';
import { Hono } from 'hono';

interface Orders {
	list(): Promise<string[]>;
}
declare const orders: Orders;

const User = token<string>()('user');
const OrdersT = token<Orders>()('orders');

export const services = container()
	.slot(User)
	.provide(OrdersT, () => orders, { lifetime: 'scoped' });

export const deps = di(services, {
	slots: (c) => ({ user: c.req.header('x-user') ?? 'anonymous' }),
});

export const exposed = { orders: OrdersT };
export const exposeOrders = deps.expose(exposed);

export const app = new Hono()
	.use(deps)
	.use('/orders/*', exposeOrders)
	.get('/orders', async (c) => c.json(await c.var.orders.list()));

export const declared = new Hono<DiEnv<typeof deps, typeof exposed>>();

import { container, token } from '@nxgt/di';

/** Value types the type tests provide. */
export interface Db {
	query(sql: string): Promise<unknown[]>;
}
export interface Orders {
	list(): Promise<string[]>;
}
export interface Principal {
	readonly id: string;
}

export const DbT = token<Db>()('db');
export const OrdersT = token<Orders>()('orders');
export const PrincipalT = token<Principal>()('principal');
export const TenantT = token<string>()('tenant');
export const AuditT = token<string[]>()('audit');
export const Unprovided = token<number>()('unprovided');

declare const db: Db;
declare const orders: Orders;

/** A singleton, a Slot, a scoped Provider that reads both, and a transient. */
export const withSlots = container()
	.provide(DbT, () => db)
	.slot(PrincipalT)
	.provide(
		OrdersT,
		async ({ get }) => {
			await get(PrincipalT);
			return orders;
		},
		{
			lifetime: 'scoped',
		},
	)
	.provide(AuditT, () => [], { lifetime: 'transient', bound: 'scoped' });

/** No Slot: `di` needs no options. */
export const withoutSlots = container().provide(DbT, () => db);

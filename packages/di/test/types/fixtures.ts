/** Value types the type tests provide. */
export interface Config {
	readonly url: string;
}
export interface Db {
	query(sql: string): Promise<unknown[]>;
}
export interface Users {
	find(id: string): Promise<{ id: string } | null>;
}

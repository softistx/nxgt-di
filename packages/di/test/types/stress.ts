// Generated: 60 Providers that mix singleton, scoped, transient (both bounds)
// and Slots, plus two Modules. It must typecheck without TS2589; its
// instantiation count is recorded in AGENTS.md.
import { container, defineModule, token } from '../../src/index';
import type { Equal, Expect } from './assert';

const scoped = { lifetime: 'scoped' } as const;
const transient = { lifetime: 'transient' } as const;
const bounded = { lifetime: 'transient', bound: 'scoped' } as const;

const T0 = token<{ v0: number }>()('t0');
const T1 = token<{ v1: number }>()('t1');
const T2 = token<{ v2: number }>()('t2');
const T3 = token<{ v3: number }>()('t3');
const T4 = token<{ v4: number }>()('t4');
const T5 = token<{ v5: number }>()('t5');
const T6 = token<{ v6: number }>()('t6');
const T7 = token<{ v7: number }>()('t7');
const T8 = token<{ v8: number }>()('t8');
const T9 = token<{ v9: number }>()('t9');
const T10 = token<{ v10: number }>()('t10');
const T11 = token<{ v11: number }>()('t11');
const T12 = token<{ v12: number }>()('t12');
const T13 = token<{ v13: number }>()('t13');
const T14 = token<{ v14: number }>()('t14');
const T15 = token<{ v15: number }>()('t15');
const T16 = token<{ v16: number }>()('t16');
const T17 = token<{ v17: number }>()('t17');
const T18 = token<{ v18: number }>()('t18');
const T19 = token<{ v19: number }>()('t19');
const T20 = token<{ v20: number }>()('t20');
const T21 = token<{ v21: number }>()('t21');
const T22 = token<{ v22: number }>()('t22');
const T23 = token<{ v23: number }>()('t23');
const T24 = token<{ v24: number }>()('t24');
const T25 = token<{ v25: number }>()('t25');
const T26 = token<{ v26: number }>()('t26');
const T27 = token<{ v27: number }>()('t27');
const T28 = token<{ v28: number }>()('t28');
const T29 = token<{ v29: number }>()('t29');
const T30 = token<{ v30: number }>()('t30');
const T31 = token<{ v31: number }>()('t31');
const T32 = token<{ v32: number }>()('t32');
const T33 = token<{ v33: number }>()('t33');
const T34 = token<{ v34: number }>()('t34');
const T35 = token<{ v35: number }>()('t35');
const T36 = token<{ v36: number }>()('t36');
const T37 = token<{ v37: number }>()('t37');
const T38 = token<{ v38: number }>()('t38');
const T39 = token<{ v39: number }>()('t39');
const T40 = token<{ v40: number }>()('t40');
const T41 = token<{ v41: number }>()('t41');
const T42 = token<{ v42: number }>()('t42');
const T43 = token<{ v43: number }>()('t43');
const T44 = token<{ v44: number }>()('t44');
const T45 = token<{ v45: number }>()('t45');
const T46 = token<{ v46: number }>()('t46');
const T47 = token<{ v47: number }>()('t47');
const T48 = token<{ v48: number }>()('t48');
const T49 = token<{ v49: number }>()('t49');
const T50 = token<{ v50: number }>()('t50');
const T51 = token<{ v51: number }>()('t51');
const T52 = token<{ v52: number }>()('t52');
const T53 = token<{ v53: number }>()('t53');
const T54 = token<{ v54: number }>()('t54');
const T55 = token<{ v55: number }>()('t55');
const T56 = token<{ v56: number }>()('t56');
const T57 = token<{ v57: number }>()('t57');
const T58 = token<{ v58: number }>()('t58');
const T59 = token<{ v59: number }>()('t59');

const first = defineModule<{
	singletons: { t19: { v19: number } };
	scoped: { t18: { v18: number } };
}>()((c) =>
	c
		.provide(T20, async ({ get }) => ({ v20: (await get(T18)).v18 }), scoped)
		.provide(T21, async ({ get }) => ({ v21: (await get(T19)).v19 }), transient)
		.provide(T22, async ({ get }) => ({ v22: (await get(T20)).v20 }), bounded),
);

const second = defineModule<{
	singletons: { t39: { v39: number } };
	scoped: { t38: { v38: number } };
}>()((c) =>
	c
		.provide(T40, async ({ get }) => ({ v40: (await get(T38)).v38 }), bounded)
		.provide(T41, async ({ get }) => ({ v41: (await get(T39)).v39 }))
		.provide(T42, async ({ get }) => ({ v42: (await get(T40)).v40 }), scoped),
);

export const app = container()
	.slot(T0)
	.provide(T1, () => ({ v1: 0 }))
	.provide(T2, async ({ get }) => ({ v2: (await get(T0)).v0 }), scoped)
	.provide(T3, async ({ get }) => ({ v3: (await get(T1)).v1 }), transient)
	.provide(T4, async ({ get }) => ({ v4: (await get(T2)).v2 }), bounded)
	.provide(T5, async ({ get }) => ({ v5: (await get(T3)).v3 }))
	.slot(T6)
	.provide(T7, async ({ get }) => ({ v7: (await get(T5)).v5 }))
	.provide(T8, async ({ get }) => ({ v8: (await get(T6)).v6 }), scoped)
	.provide(T9, async ({ get }) => ({ v9: (await get(T7)).v7 }), transient)
	.provide(T10, async ({ get }) => ({ v10: (await get(T8)).v8 }), bounded)
	.provide(T11, async ({ get }) => ({ v11: (await get(T9)).v9 }))
	.slot(T12)
	.provide(T13, async ({ get }) => ({ v13: (await get(T11)).v11 }))
	.provide(T14, async ({ get }) => ({ v14: (await get(T12)).v12 }), scoped)
	.provide(T15, async ({ get }) => ({ v15: (await get(T13)).v13 }), transient)
	.provide(T16, async ({ get }) => ({ v16: (await get(T14)).v14 }), bounded)
	.provide(T17, async ({ get }) => ({ v17: (await get(T15)).v15 }))
	.slot(T18)
	.provide(T19, async ({ get }) => ({ v19: (await get(T17)).v17 }))
	.use(first)
	.provide(T23, async ({ get }) => ({ v23: (await get(T21)).v21 }))
	.slot(T24)
	.provide(T25, async ({ get }) => ({ v25: (await get(T23)).v23 }))
	.provide(T26, async ({ get }) => ({ v26: (await get(T24)).v24 }), scoped)
	.provide(T27, async ({ get }) => ({ v27: (await get(T25)).v25 }), transient)
	.provide(T28, async ({ get }) => ({ v28: (await get(T26)).v26 }), bounded)
	.provide(T29, async ({ get }) => ({ v29: (await get(T27)).v27 }))
	.slot(T30)
	.provide(T31, async ({ get }) => ({ v31: (await get(T29)).v29 }))
	.provide(T32, async ({ get }) => ({ v32: (await get(T30)).v30 }), scoped)
	.provide(T33, async ({ get }) => ({ v33: (await get(T31)).v31 }), transient)
	.provide(T34, async ({ get }) => ({ v34: (await get(T32)).v32 }), bounded)
	.provide(T35, async ({ get }) => ({ v35: (await get(T33)).v33 }))
	.slot(T36)
	.provide(T37, async ({ get }) => ({ v37: (await get(T35)).v35 }))
	.provide(T38, async ({ get }) => ({ v38: (await get(T36)).v36 }), scoped)
	.provide(T39, async ({ get }) => ({ v39: (await get(T37)).v37 }), transient)
	.use(second)
	.provide(T43, async ({ get }) => ({ v43: (await get(T41)).v41 }))
	.provide(T44, async ({ get }) => ({ v44: (await get(T42)).v42 }), scoped)
	.provide(T45, async ({ get }) => ({ v45: (await get(T43)).v43 }), transient)
	.provide(T46, async ({ get }) => ({ v46: (await get(T44)).v44 }), bounded)
	.provide(T47, async ({ get }) => ({ v47: (await get(T45)).v45 }))
	.slot(T48)
	.provide(T49, async ({ get }) => ({ v49: (await get(T47)).v47 }))
	.provide(T50, async ({ get }) => ({ v50: (await get(T48)).v48 }), scoped)
	.provide(T51, async ({ get }) => ({ v51: (await get(T49)).v49 }), transient)
	.provide(T52, async ({ get }) => ({ v52: (await get(T50)).v50 }), bounded)
	.provide(T53, async ({ get }) => ({ v53: (await get(T51)).v51 }))
	.slot(T54)
	.provide(T55, async ({ get }) => ({ v55: (await get(T53)).v53 }))
	.provide(T56, async ({ get }) => ({ v56: (await get(T54)).v54 }), scoped)
	.provide(T57, async ({ get }) => ({ v57: (await get(T55)).v55 }), transient)
	.provide(T58, async ({ get }) => ({ v58: (await get(T56)).v56 }), bounded)
	.provide(T59, async ({ get }) => ({ v59: (await get(T57)).v57 }));

export const scope = app.createScope({
	t0: { v0: 0 },
	t6: { v6: 6 },
	t12: { v12: 12 },
	t18: { v18: 18 },
	t24: { v24: 24 },
	t30: { v30: 30 },
	t36: { v36: 36 },
	t48: { v48: 48 },
	t54: { v54: 54 },
});
const lastSingleton = app.resolve(T59);
const lastScoped = scope.resolve(T58);
export type Singleton = Expect<
	Equal<typeof lastSingleton, Promise<{ v59: number }>>
>;
export type Scoped = Expect<Equal<typeof lastScoped, Promise<{ v58: number }>>>;
// @ts-expect-error a scoped Token needs a Scope, even at the end of a long chain
app.resolve(T58);
// probe: from a Scope it resolves.
scope.resolve(T58);

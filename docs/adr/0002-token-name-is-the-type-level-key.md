# A Token's name is its key at compile time

A Token is created as `token<User>()('principal')`, and its name is a literal type that keys the Container's type. That is what lets `createScope({ principal: user })` fail to compile when a Slot is left out, and lets `provide` refuse a second Token with the same name. At runtime, identity is still a Symbol. We first wanted Symbol-only identity with `createScope({ [Principal]: p })`, but TypeScript cannot return a `unique symbol` from a function: the computed key widens to `symbol`, the "every Slot given" check is lost, and two Tokens of the same value type become the same type. Pairs `[[Token, value]]` and user-declared `unique symbol`s were rejected, because they are clumsier to check and to write.

## Consequences

- Token names must be unique within one Container, Modules included.
- The curried `token<T>()(name)` exists only because TypeScript has no partial type-argument inference.

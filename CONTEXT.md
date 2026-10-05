# nxgt-di

A dependency-injection container for applications built on the nxgt packages.
Applications are its only consumers: no `@nxgt/*` package depends on it.

## Language

**Token**:
A typed, named key that stands for one dependency, such as a database or a repository. Its name is unique within a Container and is the key used to pass Slot values.
_Avoid_: key, identifier, service id

**Provider**:
How a Token's value is made: a factory (which may be async), a lifetime, and optionally how to dispose of the value.
_Avoid_: registration, binding

**Container**:
The set of Providers an application has declared. Its type lists every Token it can resolve, so asking for a missing Token fails to compile.
_Avoid_: injector, registry, service locator

**Module**:
A reusable group of Providers that states which Tokens it needs, and is added to a Container that already provides them.
_Avoid_: plugin, bundle

**Lifetime**:
How long a resolved value lives: **singleton** (once per Container), **scoped** (once per Scope), or **transient** (new on every resolve).

**Bound**:
The longest Lifetime a transient Provider may be captured by, which it declares. A transient bound to scoped may depend on scoped values and counts as scoped.

**Scope**:
A short-lived child of a Container, usually one per HTTP request, that holds the scoped values and disposes of them when it ends.
_Avoid_: request context, child container

**Slot**:
A Token that the Container declares but does not make, because its value comes from outside, such as the request's principal. Every Scope must be given a value for each Slot when it is created.
_Avoid_: placeholder, request value

**Init**:
Creating every singleton up front, at boot, so that a failing connection stops the start-up instead of the first request. Otherwise singletons are created on first resolve.

**Exposed dependency**:
A Token that a framework integration resolves in the request's Scope and hands to the handler as a plain named value, so the handler never touches the Container.
_Avoid_: injected service, services object

**Captive dependency**:
A longer-lived value that depends on a shorter-lived one, such as a singleton depending on a scoped value. It is rejected at compile time.

**Override**:
A new Container that has the same Providers except that one Token is bound to a value given in its place, usually a fake in a test. The original Container is not changed.
_Avoid_: mock, replace

**Bun-first**:
ESM, no `reflect-metadata`, tested with `bun test`, and no Bun-only API, so it also runs on Node, but only Bun is guaranteed.
_Avoid_: Bun-native, Bun-only

## Relationships

- A **Container** holds many **Providers**, at most one per **Token**
- A **Scope** belongs to exactly one **Container** and sees all of its **Providers**
- Disposing of a **Container** or a **Scope** disposes of the values it created, in the reverse order of their creation. This includes transient values: whatever resolved one owns it. Disposing twice does nothing, but resolving after disposal fails
- Every **Token** is unique. A Container refuses two Tokens with the same name
- A value that knows how to dispose of itself is disposed of even when its Provider names no dispose

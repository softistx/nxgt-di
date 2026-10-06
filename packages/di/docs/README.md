# @nxgt/di documentation

- [Roadmap](roadmap.md) — what is coming, and what is not
- [Troubleshooting](troubleshooting.md) — the errors you can hit, by message

Guides:

- [Tokens and Providers](guide/tokens-and-providers.md): Tokens, provide order, lifetimes, the captive check, a transient's bound, disposal
- [Scopes and Slots](guide/scopes-and-slots.md): one Scope per request, Slots for the request's own values, who disposes of what
- [Modules](guide/modules.md): reusable groups of Providers, their requirements, and `use`
- [Testing](guide/testing.md): `override` a dependency, fake a Slot through `createScope`
- [Lifecycle](guide/lifecycle.md): `init` at boot, disposal at shutdown, `await using`

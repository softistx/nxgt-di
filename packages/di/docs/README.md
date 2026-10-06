# @nxgt/di documentation

## Guides

| Page | Read it when |
| --- | --- |
| [Tokens and Providers](guide/tokens-and-providers.md) | you declare dependencies: Tokens, provide order, lifetimes, the captive check, a transient's bound, disposal |
| [Scopes and Slots](guide/scopes-and-slots.md) | you need one Scope per request, and Slots for the request's own values |
| [Modules](guide/modules.md) | you group Providers for reuse and want `use` to check their requirements |
| [Testing](guide/testing.md) | you `override` a dependency or fake a Slot through `createScope` |
| [Lifecycle](guide/lifecycle.md) | you boot with `init`, shut down, or use `await using` |

## Reference

| Page | Read it when |
| --- | --- |
| [Troubleshooting](troubleshooting.md) | you have an error message, compile-time or runtime, and want its cause |
| [Roadmap](roadmap.md) | you want to know what is coming, and what is not |

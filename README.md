## Proxy util for local web app testing with JWTs 

Simple no frills CLI utility to inject different JWTs into HTTP headers for test.

Basic Usage:

`node proxy.js <listen-on> <proxy-to> [--silent] [--namespace <namespace>] [--jwt <jwtfile>.jwt]`

`listen-on`: port to listen on (inbound)

`proxy-to`: port to fwd to (with JWT injected)

`--silent`: optional arg that launches in headless mode (no GUI)

`--namespace <name>`: string to put into the namespace field of the x-forwarded-client-cert header (optional)

`--jwt <file>`: file to use for the JWT contents (optional, but basically required if in headless mode)


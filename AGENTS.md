# Repository Guidelines

## Project Structure & Module Organization

This is a small Bun-powered TypeScript CLI. Source code lives in `src/`, with the entry point and exported helpers in `src/index.ts`. Tests sit next to the code as `src/index.test.ts` and use Bun's built-in test runner. Build output is written to `dist/ports`; treat `dist/` as generated output. Project configuration is in `package.json`, `tsconfig.json`, and `pnpm-lock.yaml`.

## Build, Test, and Development Commands

Use pnpm for package scripts and Bun for runtime behavior.

- `pnpm dev` or `pnpm start`: run the CLI from `src/index.ts`.
- `pnpm test`: run the Bun test suite.
- `pnpm build`: compile a standalone executable to `dist/ports`.

The CLI expects a `docker-compose.yml` in the current working directory and prints URLs for services with published TCP ports.

## Coding Style & Naming Conventions

Write TypeScript as ES modules. Keep `strict` TypeScript compatibility and avoid loosening compiler settings. Use two-space indentation, double quotes, semicolons only if the surrounding code starts using them, and trailing commas only when they are already idiomatic in the edited block. Prefer small pure helpers for parsing and rendering logic, and export functions only when tests or CLI consumers need them.

Use descriptive names that match the domain, such as `parseComposePorts`, `renderLinks`, and `publishedPort`. Keep CLI option names aligned with their flags, for example `help` for `--help`.

## Testing Guidelines

Tests use `bun:test` with `describe`, `test`, and `expect`. Place tests in `*.test.ts` files near the code under test. Cover parsing edge cases, render output, and CLI argument behavior when changing `src/index.ts`. Run `pnpm test` before submitting changes. For behavior involving Docker Compose syntax, include compact YAML examples directly in the test body.

## Commit & Pull Request Guidelines

The current history uses short, plain commit messages such as `Initial version` and `first commit`. Continue with concise imperative or descriptive messages, for example `Add IPv6 port parsing tests`.

Pull requests should include a brief summary, the reason for the change, and the commands run for verification. Link related issues when available. Include terminal output examples when CLI behavior changes, especially for new `docker-compose.yml` port formats or changed URL rendering.

## Agent-Specific Instructions

Keep changes focused. Do not edit generated `dist/` output unless the task explicitly asks for a build artifact. Preserve the existing Bun and pnpm setup, and avoid introducing new dependencies for parsing or formatting without a clear need.

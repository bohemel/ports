# ports

Print links for services with published ports in the current directory's `docker-compose.yml`.

## Usage

```sh
pnpm dev
```

Given a compose file like this:

```yaml
services:
  web:
    ports:
      - "8080:80"
  admin:
    ports:
      - target: 443
        published: 8443
```

The CLI prints:

```txt
web: http://localhost:8080
admin: https://localhost:8443
```

## Scripts

```sh
pnpm dev      # Run the CLI from source
pnpm test     # Run tests with Bun
pnpm build    # Compile a standalone executable to dist/ports
```

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { findComposeFile, parseArgs, parseComposePorts, renderHelp, renderLinks } from "./index";

describe("parseArgs", () => {
  test("parses help and version flags", () => {
    expect(parseArgs(["--help", "--version"])).toEqual({
      help: true,
      version: true
    });
  });

  test("rejects unknown arguments", () => {
    expect(() => parseArgs(["--wat"])).toThrow("Unknown argument: --wat");
  });
});

describe("findComposeFile", () => {
  test("finds docker-compose.yml", () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, "docker-compose.yml"), "services: {}\n");

      expect(basename(findComposeFile(dir) ?? "")).toBe("docker-compose.yml");
    });
  });

  test("finds docker-compose.yaml", () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, "docker-compose.yaml"), "services: {}\n");

      expect(basename(findComposeFile(dir) ?? "")).toBe("docker-compose.yaml");
    });
  });

  test("prefers docker-compose.yml when both extensions exist", () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, "docker-compose.yml"), "services: {}\n");
      writeFileSync(join(dir, "docker-compose.yaml"), "services: {}\n");

      expect(basename(findComposeFile(dir) ?? "")).toBe("docker-compose.yml");
    });
  });
});

describe("parseComposePorts", () => {
  test("extracts published ports from short syntax", () => {
    const compose = `
services:
  web:
    ports:
      - "8080:80"
      - "127.0.0.1:5173:5173"
      - "3000"
  worker:
    image: example/worker
`;

    expect(parseComposePorts(compose)).toEqual([
      {
        service: "web",
        host: "localhost",
        publishedPort: "8080",
        targetPort: "80",
        protocol: "tcp"
      },
      {
        service: "web",
        host: "127.0.0.1",
        publishedPort: "5173",
        targetPort: "5173",
        protocol: "tcp"
      }
    ]);
  });

  test("extracts published ports from long syntax", () => {
    const compose = `
services:
  app:
    ports:
      - target: 443
        published: "8443"
        protocol: tcp
      - target: 53
        published: 5353
        protocol: udp
      - target: 80
`;

    expect(parseComposePorts(compose)).toEqual([
      {
        service: "app",
        host: "localhost",
        publishedPort: "8443",
        targetPort: "443",
        protocol: "tcp"
      }
    ]);
  });
});

describe("rendering", () => {
  test("renders links for exposed services", () => {
    expect(
      renderLinks([
        {
          service: "web",
          host: "localhost",
          publishedPort: "8080",
          targetPort: "80",
          protocol: "tcp"
        },
        {
          service: "admin",
          host: "127.0.0.1",
          publishedPort: "8443",
          targetPort: "443",
          protocol: "tcp"
        }
      ])
    ).toBe(["web: http://localhost:8080", "admin: https://127.0.0.1:8443"].join("\n"));
  });

  test("renders an empty state", () => {
    expect(renderLinks([])).toBe("No services with published TCP ports found.");
  });

  test("renders help text", () => {
    expect(renderHelp()).toContain("docker-compose.yml");
    expect(renderHelp()).toContain("docker-compose.yaml");
  });
});

function withTempDir(callback: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), "ports-test-"));

  try {
    callback(dir);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

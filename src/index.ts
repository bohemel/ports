#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_COMPOSE_FILE = "docker-compose.yml";

type CliOptions = {
  help: boolean;
  version: boolean;
};

type ComposePort = {
  service: string;
  host: string;
  publishedPort: string;
  targetPort?: string;
  protocol: string;
};

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    help: false,
    version: false
  };

  for (const arg of args) {
    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "-v" || arg === "--version") {
      options.version = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function renderHelp(): string {
  return [
    "ports",
    "",
    "Usage:",
    "  ports [options]",
    "",
    "Looks for docker-compose.yml in the current directory and prints links for services with published TCP ports.",
    "",
    "Options:",
    "  -v, --version       Show version",
    "  -h, --help          Show help"
  ].join("\n");
}

export function findComposeFile(cwd = process.cwd()): string | undefined {
  const composeFilePath = join(cwd, DEFAULT_COMPOSE_FILE);
  return existsSync(composeFilePath) ? composeFilePath : undefined;
}

export function parseComposePorts(composeContent: string): ComposePort[] {
  const document = Bun.YAML.parse(composeContent) as unknown;

  if (!isRecord(document) || !isRecord(document.services)) {
    return [];
  }

  const ports: ComposePort[] = [];

  for (const [service, definition] of Object.entries(document.services)) {
    if (!isRecord(definition) || !Array.isArray(definition.ports)) {
      continue;
    }

    for (const entry of definition.ports) {
      const port = parsePortEntry(service, entry);

      if (port) {
        ports.push(port);
      }
    }
  }

  return ports;
}

export function renderLinks(ports: ComposePort[]): string {
  if (ports.length === 0) {
    return "No services with published TCP ports found.";
  }

  return ports.map((port) => `${port.service}: ${renderUrl(port)}`).join("\n");
}

function parsePortEntry(service: string, entry: unknown): ComposePort | undefined {
  if (typeof entry === "number") {
    return undefined;
  }

  if (typeof entry === "string") {
    return parseShortPort(service, entry);
  }

  if (!isRecord(entry)) {
    return undefined;
  }

  const published = normalizePort(entry.published);

  if (!published) {
    return undefined;
  }

  const protocol = normalizeProtocol(entry.protocol);

  if (protocol !== "tcp") {
    return undefined;
  }

  return {
    service,
    host: normalizeHost(entry.host_ip),
    publishedPort: published,
    targetPort: normalizePort(entry.target),
    protocol
  };
}

function parseShortPort(service: string, value: string): ComposePort | undefined {
  const withoutProtocol = value.trim().replace(/^['"]|['"]$/g, "");

  if (!withoutProtocol) {
    return undefined;
  }

  const [portDefinition, protocol = "tcp"] = withoutProtocol.split("/");

  if (protocol !== "tcp") {
    return undefined;
  }

  const parts = splitPortDefinition(portDefinition);

  if (parts.length < 2) {
    return undefined;
  }

  const publishedPort = normalizePort(parts.at(-2));

  if (!publishedPort) {
    return undefined;
  }

  return {
    service,
    host: normalizeHost(parts.length > 2 ? parts.slice(0, -2).join(":") : undefined),
    publishedPort,
    targetPort: normalizePort(parts.at(-1)),
    protocol
  };
}

function splitPortDefinition(portDefinition: string): string[] {
  const bracketedIpv6Match = portDefinition.match(/^\[([^\]]+)\]:(.+)$/);

  if (bracketedIpv6Match) {
    return [bracketedIpv6Match[1], ...bracketedIpv6Match[2].split(":")];
  }

  return portDefinition.split(":");
}

function renderUrl(port: ComposePort): string {
  const scheme = port.publishedPort === "443" || port.targetPort === "443" ? "https" : "http";
  const host = port.host.includes(":") ? `[${port.host}]` : port.host;

  return `${scheme}://${host}:${port.publishedPort}`;
}

function normalizePort(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return String(value);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  return undefined;
}

function normalizeHost(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim().replace(/^\[|\]$/g, "");
  }

  return "localhost";
}

function normalizeProtocol(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : "tcp";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function main(args: string[]): Promise<void> {
  const options = parseArgs(args);

  if (options.help) {
    console.log(renderHelp());
    return;
  }

  if (options.version) {
    const packageJson = await import("../package.json");
    console.log(packageJson.default.version);
    return;
  }

  const composeFilePath = findComposeFile();

  if (!composeFilePath) {
    throw new Error(`Could not find ${DEFAULT_COMPOSE_FILE} in the current directory.`);
  }

  const composeContent = readFileSync(composeFilePath, "utf8");
  console.log(renderLinks(parseComposePorts(composeContent)));
}

if (import.meta.main) {
  main(Bun.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}

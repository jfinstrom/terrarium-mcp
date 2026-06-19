import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export const ROOT_DIR = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

export const SERVER_ENTRY = path.join(ROOT_DIR, "dist", "index.js");

export function extractToolText(result: {
	content: Array<{ type: string; text?: string }>;
	isError?: boolean;
}): string {
	return result.content
		.filter(
			(c): c is { type: "text"; text: string } =>
				c.type === "text" && typeof c.text === "string",
		)
		.map((c) => c.text)
		.join("\n");
}

/**
 * Spawn dist/index.js and connect via stdio MCP — same path Cursor uses.
 */
export async function withStdioMcpClient(
	fn: (
		client: Client,
		transport: StdioClientTransport,
	) => Promise<void>,
): Promise<void> {
	const transport = new StdioClientTransport({
		command: process.execPath,
		args: [SERVER_ENTRY],
		cwd: ROOT_DIR,
		stderr: "pipe",
	});

	const client = new Client({ name: "terrarium-integration-stdio", version: "1.0.0" });
	await client.connect(transport);

	try {
		await fn(client, transport);
	} finally {
		await client.close();
	}
}

/**
 * Spawn dist/index.js --http, wait for health, connect MCP client over SSE.
 */
export async function withHttpMcpClient(
	port: number,
	fn: (client: Client, proc: ChildProcess) => Promise<void>,
): Promise<void> {
	const proc = spawnHttpServer(port);

	try {
		await waitForHealth(port);
		const transport = new SSEClientTransport(
			new URL(`http://127.0.0.1:${port}/sse`),
		);
		const client = new Client({
			name: "terrarium-integration-http",
			version: "1.0.0",
		});
		await client.connect(transport);

		try {
			await fn(client, proc);
		} finally {
			await client.close();
		}
	} finally {
		await stopProcess(proc);
	}
}

/** @deprecated Use withStdioMcpClient */
export const withMcpClient = (
	fn: (client: Client) => Promise<void>,
) => withStdioMcpClient((client) => fn(client));

export async function waitForHealth(
	port: number,
	timeoutMs = 10_000,
): Promise<Record<string, unknown>> {
	const deadline = Date.now() + timeoutMs;
	let lastError: unknown;

	while (Date.now() < deadline) {
		try {
			const res = await fetch(`http://127.0.0.1:${port}/health`);
			if (res.ok) {
				return (await res.json()) as Record<string, unknown>;
			}
		} catch (err) {
			lastError = err;
		}
		await sleep(100);
	}

	throw new Error(
		`Health check timed out on port ${port}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
	);
}

export function spawnHttpServer(port: number): ChildProcess {
	return spawn(process.execPath, [SERVER_ENTRY, "--http"], {
		cwd: ROOT_DIR,
		env: { ...process.env, PORT: String(port) },
		stdio: ["ignore", "pipe", "pipe"],
	});
}

export async function stopProcess(proc: ChildProcess): Promise<void> {
	if (proc.exitCode !== null || proc.signalCode !== null) return;

	await new Promise<void>((resolve) => {
		const timer = setTimeout(() => {
			proc.kill("SIGKILL");
			resolve();
		}, 3000);
		proc.once("exit", () => {
			clearTimeout(timer);
			resolve();
		});
		proc.kill("SIGTERM");
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
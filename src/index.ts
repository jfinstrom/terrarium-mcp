#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { loadManifest } from "./catalog.js";
import { CONTEXT_DIR, SOURCES_DIR } from "./paths.js";
import { createServer, SERVER_NAME } from "./server.js";

async function runStdio() {
	const server = createServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error(`${SERVER_NAME} MCP server running on stdio`);
}

async function runHttp(port: number) {
	const transports = new Map<string, SSEServerTransport>();

	const httpServer = http.createServer(async (req, res) => {
		const url = new URL(req.url ?? "/", `http://localhost:${port}`);

		if (url.pathname === "/health") {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(
				JSON.stringify({
					status: "ok",
					name: SERVER_NAME,
					topics: loadManifest().topics.length,
					contextDir: CONTEXT_DIR,
					sourcesAvailable: fs.existsSync(SOURCES_DIR),
				}),
			);
			return;
		}

		if (url.pathname === "/sse" && req.method === "GET") {
			try {
				const transport = new SSEServerTransport("/message", res);
				transports.set(transport.sessionId, transport);
				transport.onclose = () => transports.delete(transport.sessionId);
				const server = createServer();
				await server.connect(transport);
			} catch (err) {
				console.error("SSE connection error:", err);
				if (!res.headersSent) {
					res.writeHead(500);
					res.end("SSE connection failed");
				}
			}
			return;
		}

		if (url.pathname === "/message" && req.method === "POST") {
			const sessionId = url.searchParams.get("sessionId");
			const transport = sessionId ? transports.get(sessionId) : undefined;
			if (!transport) {
				res.writeHead(400);
				res.end("Invalid session");
				return;
			}
			await transport.handlePostMessage(req, res);
			return;
		}

		res.writeHead(404);
		res.end("Terrarium MCP — connect via /sse");
	});

	httpServer.listen(port, () => {
		console.error(
			`${SERVER_NAME} MCP HTTP server on http://localhost:${port}/sse`,
		);
	});
}

const useHttp = process.argv.includes("--http");
const port = Number(process.env.PORT ?? "3100");

if (useHttp) {
	runHttp(port).catch((err) => {
		console.error(err);
		process.exit(1);
	});
} else {
	runStdio().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
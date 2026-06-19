import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	spawnHttpServer,
	stopProcess,
	waitForHealth,
	withHttpMcpClient,
} from "../helpers.js";
import { runCoreIntegrationScenarios } from "./scenarios.js";

describe("Integration — HTTP server (spawned process)", () => {
	it("health endpoint responds while server is running", async () => {
		const port = 32010;
		const proc = spawnHttpServer(port);

		try {
			const health = await waitForHealth(port);
			assert.equal(health.status, "ok");
			assert.equal(health.name, "terrarium-mcp");
			assert.equal(health.topics, 48);
			assert.ok(proc.pid && proc.pid > 0);
		} finally {
			await stopProcess(proc);
		}
	});

	it("full MCP session over HTTP/SSE against live server", async () => {
		const port = 32011;

		await withHttpMcpClient(port, async (client, proc) => {
			assert.ok(proc.pid && proc.pid > 0, "HTTP server is a separate process");
			await runCoreIntegrationScenarios(client);
		});
	});

	it("returns 404 for unknown HTTP routes", async () => {
		const port = 32012;
		const proc = spawnHttpServer(port);

		try {
			await waitForHealth(port);
			const res = await fetch(`http://127.0.0.1:${port}/nope`);
			assert.equal(res.status, 404);
		} finally {
			await stopProcess(proc);
		}
	});
});
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	extractToolText,
	ROOT_DIR,
	SERVER_ENTRY,
	withStdioMcpClient,
} from "../helpers.js";
import { runCoreIntegrationScenarios } from "./scenarios.js";

describe("Integration — stdio server (spawned process)", () => {
	it("runs compiled dist/index.js as a child process", () => {
		assert.ok(fs.existsSync(SERVER_ENTRY));
	});

	it("full MCP session over stdio: tools, resources, prompts", async () => {
		await withStdioMcpClient(async (client, transport) => {
			assert.ok(
				transport.pid && transport.pid > 0,
				"server should be a separate OS process",
			);

			await runCoreIntegrationScenarios(client);

			const deps = await client.callTool({
				name: "get_topic_details",
				arguments: {
					query: "08",
					include_dependencies: true,
					detail_level: "full-doc",
				},
			});
			const text = extractToolText(deps);
			assert.match(text, /# Topic 01:/);
			assert.match(text, /# Topic 08:/);
		});
	});

	it("48 context files present where the spawned server reads them", () => {
		assert.equal(
			fs.readdirSync(path.join(ROOT_DIR, "context")).filter((f) =>
				f.endsWith(".md"),
			).length,
			48,
		);
	});
});
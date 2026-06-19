import assert from "node:assert/strict";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { extractToolText } from "../helpers.js";

/**
 * Shared integration scenarios run against a live Terrarium MCP server
 * over any transport (stdio, HTTP/SSE, etc.).
 */
export async function runCoreIntegrationScenarios(
	client: Client,
): Promise<void> {
	const { tools } = await client.listTools();
	const toolNames = tools.map((t) => t.name).sort();
	assert.deepEqual(toolNames, [
		"get_topic",
		"list_topics",
		"read_source_file",
		"search_context",
		"search_sources",
		"suggest_learning_path",
	]);

	const listResult = await client.callTool({
		name: "list_topics",
		arguments: {},
	});
	assert.match(extractToolText(listResult), /Terrarium MCP — 48 topics/);

	const tierResult = await client.callTool({
		name: "list_topics",
		arguments: { tier: 1 },
	});
	assert.match(extractToolText(tierResult), /Terrarium MCP — 5 topics/);

	const topicResult = await client.callTool({
		name: "get_topic",
		arguments: { query: "08" },
	});
	assert.match(extractToolText(topicResult), /BMO class/i);

	const badTopic = await client.callTool({
		name: "get_topic",
		arguments: { query: "not-a-real-topic-xyz" },
	});
	assert.equal(badTopic.isError, true);

	const searchResult = await client.callTool({
		name: "search_context",
		arguments: { query: "bootstrap.php", limit: 5 },
	});
	assert.match(extractToolText(searchResult), /Found \d+ matches/);

	const pathResult = await client.callTool({
		name: "suggest_learning_path",
		arguments: { task: "build module with ajax grid" },
	});
	assert.match(extractToolText(pathResult), /Suggested learning path/);

	const { resources } = await client.listResources();
	assert.equal(resources.length, 49);
	assert.ok(resources.some((r) => r.uri === "terrarium://index"));

	const resource = await client.readResource({
		uri: "terrarium://context/01-bootstrap-and-global-state",
	});
	assert.match(
		String(resource.contents[0].text),
		/Bootstrap Chain and Global State/i,
	);

	const { prompts } = await client.listPrompts();
	assert.equal(prompts.length, 2);

	const prompt = await client.getPrompt({
		name: "debug-freepbx-module",
		arguments: { symptom: "ajax returns 500", module_name: "testmod" },
	});
	const msg = prompt.messages[0];
	const text =
		typeof msg.content === "string"
			? msg.content
			: msg.content.type === "text"
				? msg.content.text
				: "";
	assert.match(text, /ajax returns 500/);
}
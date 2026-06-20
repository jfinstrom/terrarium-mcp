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
		"expand_topic_dependencies",
		"generate_module_plan",
		"get_topic_details",
		"read_source_file",
		"recommend_context_for_task",
		"search_context",
		"search_sources",
	]);

	const listResult = await client.callTool({
		name: "get_topic_details",
		arguments: {},
	});
	assert.match(extractToolText(listResult), /Terrarium MCP — 48 topics/);

	const tierResult = await client.callTool({
		name: "get_topic_details",
		arguments: { tier: 1 },
	});
	assert.match(extractToolText(tierResult), /Terrarium MCP — 5 topics/);

	const topicResult = await client.callTool({
		name: "get_topic_details",
		arguments: { query: "08", detail_level: "full-doc" },
	});
	assert.match(extractToolText(topicResult), /BMO class/i);

	const summaryResult = await client.callTool({
		name: "get_topic_details",
		arguments: { query: "15", detail_level: "summary" },
	});
	assert.match(extractToolText(summaryResult), /Likely files:/);

	const badTopic = await client.callTool({
		name: "get_topic_details",
		arguments: { query: "not-a-real-topic-xyz" },
	});
	assert.equal(badTopic.isError, true);

	const searchResult = await client.callTool({
		name: "search_context",
		arguments: { query: "bootstrap.php", limit: 5 },
	});
	assert.match(extractToolText(searchResult), /Found \d+ matches/);

	const contextResult = await client.callTool({
		name: "recommend_context_for_task",
		arguments: {
			task: "Add a database-backed admin page with AJAX grid",
			task_type: "feature",
			target_area: "gui",
		},
	});
	const contextText = extractToolText(contextResult);
	assert.match(contextText, /Recommended topics:/);
	assert.match(contextText, /Likely files:/);
	assert.match(contextText, /Next step:/);

	const bugfixResult = await client.callTool({
		name: "recommend_context_for_task",
		arguments: {
			task: "Fix why settings save but don't persist",
			task_type: "bugfix",
		},
	});
	assert.match(extractToolText(bugfixResult), /Diagnostic checklist:/);

	const depsResult = await client.callTool({
		name: "expand_topic_dependencies",
		arguments: { query: "15" },
	});
	assert.match(extractToolText(depsResult), /Dependency chain/);

	const planResult = await client.callTool({
		name: "generate_module_plan",
		arguments: {
			rawname: "orders",
			features: ["gui", "database", "ajax", "backup"],
		},
	});
	const planText = extractToolText(planResult);
	assert.match(planText, /Module plan: orders/);
	assert.match(planText, /Backup\.php/);
	assert.match(planText, /Implementation order:/);

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
	assert.match(text, /recommend_context_for_task/);
}
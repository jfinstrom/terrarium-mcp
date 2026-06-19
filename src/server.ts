import fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
	expandDependencies,
	loadManifest,
	resolveTopic,
	suggestTopicsForTask,
} from "./catalog.js";
import {
	contextUri,
	resolveContextPath,
	resolveSourcePath,
	SOURCES_DIR,
} from "./paths.js";
import {
	formatTopicSummary,
	searchContext,
	searchSources,
} from "./search.js";

export const SERVER_NAME = "terrarium-mcp";
export const SERVER_VERSION = "1.0.0";

function readTopicContent(topic: { file: string }): string {
	const filePath = resolveContextPath(topic.file);
	return fs.readFileSync(filePath, "utf8");
}

function textResult(text: string, isError = false) {
	return {
		content: [{ type: "text" as const, text }],
		...(isError ? { isError: true } : {}),
	};
}

export function createServer(): McpServer {
	const server = new McpServer({
		name: SERVER_NAME,
		version: SERVER_VERSION,
	});

	const manifest = loadManifest();

	for (const topic of manifest.topics) {
		const uri = contextUri(topic.id, topic.slug);
		server.resource(
			`topic-${topic.id}`,
			uri,
			{
				description: `Tier ${topic.tier}: ${topic.title}`,
				mimeType: "text/markdown",
			},
			async () => ({
				contents: [
					{
						uri,
						mimeType: "text/markdown",
						text: readTopicContent(topic),
					},
				],
			}),
		);
	}

	server.resource(
		"topic-index",
		"terrarium://index",
		{
			description: "Terrarium MCP topic catalog with tiers and dependencies",
			mimeType: "application/json",
		},
		async () => ({
			contents: [
				{
					uri: "terrarium://index",
					mimeType: "application/json",
					text: JSON.stringify(manifest, null, 2),
				},
			],
		}),
	);

	server.tool(
		"list_topics",
		"List FreePBX development topics by tier. Use before get_topic to discover available documentation.",
		{
			tier: z
				.number()
				.int()
				.min(1)
				.max(6)
				.optional()
				.describe("Filter by tier 1-6"),
			query: z
				.string()
				.optional()
				.describe("Optional text filter on title or slug"),
		},
		async ({ tier, query }) => {
			let topics = manifest.topics;
			if (tier !== undefined) {
				topics = topics.filter((t) => t.tier === tier);
			}
			if (query) {
				const q = query.toLowerCase();
				topics = topics.filter(
					(t) =>
						t.title.toLowerCase().includes(q) ||
						t.slug.includes(q),
				);
			}
			const lines = topics.map(formatTopicSummary);
			const tierInfo = manifest.tiers
				.map((t) => `Tier ${t.id}: ${t.name} — ${t.description}`)
				.join("\n");
			return textResult(
				`Terrarium MCP — ${topics.length} topics\n\n${tierInfo}\n\n${lines.join("\n")}`,
			);
		},
	);

	server.tool(
		"get_topic",
		"Retrieve full markdown content for a FreePBX development topic by id (01-48), slug, or keyword.",
		{
			query: z
				.string()
				.describe("Topic id (e.g. 08), slug (bmo-class-interface), or keyword"),
			include_dependencies: z
				.boolean()
				.optional()
				.default(false)
				.describe("Include prerequisite topics before the requested topic"),
		},
		async ({ query, include_dependencies }) => {
			const topic = resolveTopic(query);
			if (!topic) {
				return textResult(`No topic found for: ${query}`, true);
			}
			const topics = include_dependencies
				? expandDependencies(topic, true)
				: [topic];
			const parts = topics.map((t) => {
				const header = `# Topic ${t.id}: ${t.title}\n\nFile: ${t.file}\nTier: ${t.tier}\n\n`;
				return header + readTopicContent(t);
			});
			return textResult(parts.join("\n\n---\n\n"));
		},
	);

	server.tool(
		"search_context",
		"Full-text search across all 48 FreePBX context documents. Use when you don't know which topic covers a concept.",
		{
			query: z.string().describe("Search terms"),
			limit: z.number().int().min(1).max(50).optional().default(15),
		},
		async ({ query, limit }) => {
			const matches = searchContext(query, limit);
			if (matches.length === 0) {
				return textResult(`No matches for: ${query}`);
			}
			const lines = matches.map(
				(m) => `${m.file}:${m.line} — ${m.text}`,
			);
			return textResult(`Found ${matches.length} matches:\n\n${lines.join("\n")}`);
		},
	);

	server.tool(
		"suggest_learning_path",
		"Suggest an ordered list of topics for a development task (e.g. 'build a module with AJAX grid and dialplan').",
		{
			task: z.string().describe("What you are trying to build or debug"),
		},
		async ({ task }) => {
			const topics = suggestTopicsForTask(task);
			const lines = topics.map(
				(t, i) => `${i + 1}. ${formatTopicSummary(t)}`,
			);
			return textResult(
				`Suggested learning path for: "${task}"\n\n${lines.join("\n")}\n\nUse get_topic with include_dependencies=true for full content.`,
			);
		},
	);

	server.tool(
		"search_sources",
		"Search cloned FreePBX source repositories under sources/. Requires running scripts/clone-sources first.",
		{
			query: z.string().describe("Search terms (class names, function names, etc.)"),
			limit: z.number().int().min(1).max(50).optional().default(20),
		},
		async ({ query, limit }) => {
			if (!fs.existsSync(SOURCES_DIR)) {
				return textResult(
					"Sources not cloned. Run: ./scripts/clone-sources.sh (or .ps1 on Windows)",
					true,
				);
			}
			const matches = searchSources(query, limit);
			if (matches.length === 0) {
				return textResult(`No source matches for: ${query}`);
			}
			const lines = matches.map(
				(m) => `${m.file}:${m.line} — ${m.text}`,
			);
			return textResult(`Found ${matches.length} source matches:\n\n${lines.join("\n")}`);
		},
	);

	server.tool(
		"read_source_file",
		"Read a file from the optional sources/ directory. Path must be under sources/ (e.g. sources/framework/...).",
		{
			path: z
				.string()
				.describe("Relative path under sources/, e.g. sources/helloworld/Helloworld.class.php"),
			offset: z.number().int().min(1).optional().default(1),
			limit: z.number().int().min(1).max(500).optional().default(120),
		},
		async ({ path: filePath, offset, limit }) => {
			if (!fs.existsSync(SOURCES_DIR)) {
				return textResult("Sources not cloned.", true);
			}
			try {
				const resolved = resolveSourcePath(
					filePath.replace(/^sources[\\/]/, ""),
				);
				const content = fs.readFileSync(resolved, "utf8");
				const lines = content.split("\n");
				const slice = lines.slice(offset - 1, offset - 1 + limit);
				const numbered = slice
					.map((line, i) => `${offset + i}|${line}`)
					.join("\n");
				return textResult(
					`${filePath} (lines ${offset}-${offset + slice.length - 1})\n\n${numbered}`,
				);
			} catch (e) {
				return textResult(
					`Error reading file: ${e instanceof Error ? e.message : String(e)}`,
					true,
				);
			}
		},
	);

	server.prompt(
		"new-freepbx-module",
		"Guided workflow for scaffolding a new FreePBX BMO module",
		{
			module_name: z.string().describe("rawname of the module, e.g. myapp"),
			features: z
				.string()
				.optional()
				.describe("Comma-separated features: gui,ajax,dialplan,api,ucp,backup"),
		},
		async ({ module_name, features }) => {
			const featureList = features ?? "gui";
			return {
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text" as const,
							text: `You are an open-source PBX module developer assistant with access to Terrarium MCP tools.

Task: Create a new BMO module named "${module_name}" with features: ${featureList}.

Workflow:
1. Call suggest_learning_path for this task
2. Call get_topic for topics 01, 02, 08, 06, 48 with include_dependencies
3. Use search_sources on helloworld and framework for reference implementations
4. Follow naming conventions (topic 42) and code style (topic 43)
5. Produce: module.xml, ${module_name.charAt(0).toUpperCase() + module_name.slice(1)}.class.php, page.${module_name}.php, views/

Ground all claims in context docs or source files — flag anything unverified.`,
						},
					},
				],
			};
		},
	);

	server.prompt(
		"debug-freepbx-module",
		"Structured debugging workflow for FreePBX module issues",
		{
			symptom: z.string().describe("What is going wrong"),
			module_name: z.string().optional().describe("Module rawname if known"),
		},
		async ({ symptom, module_name }) => {
			return {
				messages: [
					{
						role: "user" as const,
						content: {
							type: "text" as const,
							text: `Debug this open-source PBX module issue using Terrarium MCP tools.

Symptom: ${symptom}
${module_name ? `Module: ${module_name}` : ""}

Workflow:
1. search_context for the symptom
2. suggest_learning_path based on the symptom
3. get_topic for matching topics with include_dependencies
4. If sources cloned: search_sources for relevant framework/module code
5. Check common areas: bootstrap (01), hooks (16-17), ajax (15), dialplan (18), reload (24), errors (44)

Provide root-cause analysis grounded in documentation or source — no guessing.`,
						},
					},
				],
			};
		},
	);

	return server;
}
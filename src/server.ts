import fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
	buildTaskContextPlan,
	expandDependencies,
	loadManifest,
	resolveTopic,
	type TargetArea,
	type TaskType,
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
import {
	formatModulePlan,
	formatTaskContextPlan,
	formatTopicDetails,
	generateModulePlan,
} from "./task-context.js";
import { getTopicGuidance, resolveLikelyFiles } from "./topic-metadata.js";

export const SERVER_NAME = "terrarium-mcp";
export const SERVER_VERSION = "1.1.0";

const RECOMMEND_CONTEXT_DESCRIPTION = `Use BEFORE editing or creating FreePBX module code. Returns structured implementation context: recommended topics, prerequisites, likely files, steps, and pitfalls.

Use when the task involves module scaffolding, GUI pages, AJAX, dialplan, database schema, UCP, backup/restore, signing, packaging, or API work.

Examples — use this tool when the user says:
- "Create a new FreePBX module named orders"
- "Add a database-backed settings page"
- "Fix a bug in AJAX grid loading"
- "Implement backup/restore support"
- "Add a fwconsole command"
- "Fix why settings save but don't persist"

Do NOT use for generic TypeScript/Node debugging unrelated to FreePBX module design.`;

const GET_TOPIC_DETAILS_DESCRIPTION = `Get FreePBX topic guidance by id (01-48), slug, or keyword. Returns concise coding context by default — not a full doc dump.

Use when you need details on a specific topic after recommend_context_for_task, or to list topics (omit query).

Examples:
- query="gui-pages-views" for admin page routing
- query="07" for module.xml database schema
- query="ajax" for AJAX routing patterns
- tier=2 with no query to list tier-2 topics`;

const EXPAND_DEPENDENCIES_DESCRIPTION = `Expand prerequisite topics for a FreePBX topic in dependency order. Use before reading full docs for a complex topic.

Examples:
- query="15" before implementing AJAX (includes BMO class prerequisites)
- query="18" before dialplan work`;

const GENERATE_MODULE_PLAN_DESCRIPTION = `Generate a scaffold plan for a new FreePBX BMO module: file tree, naming transforms, topic references, and implementation order.

Use when creating a module from scratch or adding major feature surfaces.

Examples:
- rawname="orders", features=["gui", "database", "ajax"]
- rawname="myapp", features=["gui", "backup", "console"]
- rawname="portal", features=["ucp", "api-rest"]`;

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

const detailLevelSchema = z
	.enum(["summary", "detailed", "full-doc"])
	.optional()
	.default("summary");

const taskTypeSchema = z
	.enum(["scaffold", "feature", "bugfix", "refactor", "docs"])
	.optional();

const targetAreaSchema = z
	.enum([
		"gui",
		"ajax",
		"dialplan",
		"database",
		"api",
		"ucp",
		"packaging",
		"backup",
		"cli",
		"hooks",
	])
	.optional();

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
		"recommend_context_for_task",
		RECOMMEND_CONTEXT_DESCRIPTION,
		{
			task: z
				.string()
				.describe(
					"What you are building, fixing, or scaffolding — e.g. 'Add database-backed admin page'",
				),
			task_type: taskTypeSchema.describe(
				"Optional override: scaffold | feature | bugfix | refactor | docs",
			),
			target_area: targetAreaSchema.describe(
				"Optional focus: gui | ajax | dialplan | database | api | ucp | packaging | backup | cli | hooks",
			),
			include_dependencies: z
				.boolean()
				.optional()
				.default(true)
				.describe("Include prerequisite topics not already in recommendations"),
			module_rawname: z
				.string()
				.optional()
				.describe("Module rawname to resolve {rawname}/{Rawname} in likely file paths"),
			detail_level: detailLevelSchema.describe(
				"summary (default): concise bullets. detailed: JSON. full-doc: same as detailed",
			),
		},
		async ({
			task,
			task_type,
			target_area,
			include_dependencies,
			module_rawname,
			detail_level,
		}) => {
			const plan = buildTaskContextPlan(task, {
				taskType: task_type as TaskType | undefined,
				targetArea: target_area as TargetArea | undefined,
				includeDependencies: include_dependencies,
				rawname: module_rawname,
			});
			const level = detail_level === "full-doc" ? "detailed" : detail_level;
			return textResult(formatTaskContextPlan(plan, level));
		},
	);

	server.tool(
		"get_topic_details",
		GET_TOPIC_DETAILS_DESCRIPTION,
		{
			query: z
				.string()
				.optional()
				.describe("Topic id, slug, or keyword. Omit to list topics."),
			tier: z
				.number()
				.int()
				.min(1)
				.max(6)
				.optional()
				.describe("Filter listed topics by tier when query is omitted"),
			include_dependencies: z
				.boolean()
				.optional()
				.default(false)
				.describe("Include prerequisite topics (full-doc mode only)"),
			module_rawname: z
				.string()
				.optional()
				.describe("Resolve {rawname}/{Rawname} placeholders in likely files"),
			detail_level: detailLevelSchema.describe(
				"summary: bullets. detailed: JSON metadata. full-doc: complete markdown content",
			),
		},
		async ({ query, tier, include_dependencies, module_rawname, detail_level }) => {
			if (!query) {
				let topics = manifest.topics;
				if (tier !== undefined) {
					topics = topics.filter((t) => t.tier === tier);
				}
				const lines = topics.map(formatTopicSummary);
				const tierInfo = manifest.tiers
					.map((t) => `Tier ${t.id}: ${t.name} — ${t.description}`)
					.join("\n");
				return textResult(
					`Terrarium MCP — ${topics.length} topics\n\n${tierInfo}\n\n${lines.join("\n")}`,
				);
			}

			const topic = resolveTopic(query);
			if (!topic) {
				return textResult(`No topic found for: ${query}`, true);
			}

			const topics =
				detail_level === "full-doc" && include_dependencies
					? expandDependencies(topic, true)
					: [topic];

			if (detail_level === "full-doc") {
				const parts = topics.map((t) => {
					const header = `# Topic ${t.id}: ${t.title}\n\nFile: ${t.file}\nTier: ${t.tier}\n\n`;
					return header + readTopicContent(t);
				});
				return textResult(parts.join("\n\n---\n\n"));
			}

			const parts = topics.map((t) => {
				const guidance = getTopicGuidance(t.id);
				const likelyFiles = resolveLikelyFiles(
					guidance.likelyFiles,
					module_rawname,
				);
				return formatTopicDetails(
					t,
					{ ...guidance, likelyFiles },
					detail_level,
				);
			});

			return textResult(parts.join("\n\n"));
		},
	);

	server.tool(
		"expand_topic_dependencies",
		EXPAND_DEPENDENCIES_DESCRIPTION,
		{
			query: z
				.string()
				.describe("Topic id, slug, or keyword"),
			include_self: z
				.boolean()
				.optional()
				.default(true)
				.describe("Include the requested topic in the result"),
			detail_level: detailLevelSchema,
		},
		async ({ query, include_self, detail_level }) => {
			const topic = resolveTopic(query);
			if (!topic) {
				return textResult(`No topic found for: ${query}`, true);
			}

			const topics = expandDependencies(topic, include_self);
			if (detail_level === "detailed" || detail_level === "full-doc") {
				return textResult(
					JSON.stringify(
						topics.map((t) => ({
							id: t.id,
							slug: t.slug,
							title: t.title,
							tier: t.tier,
							dependencies: t.dependencies,
							likelyFiles: getTopicGuidance(t.id).likelyFiles,
						})),
						null,
						2,
					),
				);
			}

			const lines = topics.map(
				(t, i) =>
					`${i + 1}. [${t.id}] ${t.title} (${t.slug}) — deps: ${t.dependencies.join(", ") || "none"}`,
			);
			return textResult(
				`Dependency chain for ${topic.id}-${topic.slug}:\n\n${lines.join("\n")}`,
			);
		},
	);

	server.tool(
		"generate_module_plan",
		GENERATE_MODULE_PLAN_DESCRIPTION,
		{
			rawname: z
				.string()
				.describe("Module rawname (lowercase), e.g. myapp"),
			features: z
				.array(z.string())
				.optional()
				.default(["gui"])
				.describe(
					"Feature surfaces: gui, database, ajax, dialplan, backup, ucp, api-rest, api-graphql, console, hooks",
				),
			detail_level: detailLevelSchema,
		},
		async ({ rawname, features, detail_level }) => {
			const plan = generateModulePlan(rawname, features);
			const level = detail_level === "full-doc" ? "full-doc" : detail_level;
			return textResult(formatModulePlan(plan, level));
		},
	);

	server.tool(
		"search_context",
		"Full-text search across FreePBX context documents. Use when recommend_context_for_task did not surface the right topic, or for ad-hoc concept lookup. Not a substitute for recommend_context_for_task before coding.",
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
		"search_sources",
		"Search cloned FreePBX source repositories under sources/. Use for reference implementations after recommend_context_for_task. Requires scripts/clone-sources first.",
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
		"Read a file from the optional sources/ directory for reference implementations. Path must be under sources/.",
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
1. Call generate_module_plan for rawname="${module_name}" with the requested features
2. Call recommend_context_for_task with task_type="scaffold"
3. Call get_topic_details for topics 01, 02, 08, 06, 48 with detail_level="full-doc" and include_dependencies
4. Use search_sources on helloworld and framework for reference implementations
5. Follow naming conventions (topic 42) and code style (topic 43)
6. Produce the file tree from generate_module_plan

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
1. Call recommend_context_for_task with task_type="bugfix"${module_name ? ` and module_rawname="${module_name}"` : ""}
2. search_context for the symptom if topics are unclear
3. get_topic_details for matching topics with detail_level="detailed"
4. If sources cloned: search_sources for relevant framework/module code
5. Use diagnostic checklist and likely files from recommend_context_for_task

Provide root-cause analysis grounded in documentation or source — no guessing.`,
						},
					},
				],
			};
		},
	);

	return server;
}
import fs from "node:fs";
import { MANIFEST_PATH } from "./paths.js";
import {
	getTopicGuidance,
	resolveLikelyFiles,
	type TopicGuidance,
} from "./topic-metadata.js";

export interface Tier {
	id: number;
	name: string;
	description: string;
}

export interface Topic {
	id: string;
	tier: number;
	slug: string;
	title: string;
	file: string;
	complexity: string;
	dependencies: string[];
	likelyFiles?: string[];
	commonTasks?: string[];
	commonPitfalls?: string[];
	commonBugPatterns?: string[];
	diagnosticChecklist?: string[];
	relatedKeywords?: string[];
	implementationNotes?: string[];
}

export interface SourceRepo {
	name: string;
	url: string;
	branch: string;
	path: string;
}

export interface Manifest {
	version: string;
	name: string;
	description: string;
	tiers: Tier[];
	topics: Topic[];
	sourceRepos: SourceRepo[];
}

export type TaskType = "scaffold" | "feature" | "bugfix" | "refactor" | "docs";

export type TargetArea =
	| "gui"
	| "ajax"
	| "dialplan"
	| "database"
	| "api"
	| "ucp"
	| "packaging"
	| "backup"
	| "cli"
	| "hooks";

export interface SuggestedTopic {
	topic: Topic;
	score: number;
	matchedBy: string[];
	reason: string;
}

export interface TaskContextPlan {
	taskType: TaskType;
	task: string;
	targetArea?: TargetArea;
	recommendedTopics: SuggestedTopic[];
	prerequisites: Topic[];
	likelyFiles: string[];
	implementationSteps: string[];
	pitfalls: string[];
	commonBugPatterns: string[];
	diagnosticChecklist: string[];
	nextStep: string;
}

let cached: Manifest | null = null;

function enrichTopic(topic: Topic): Topic {
	const guidance = getTopicGuidance(topic.id);
	return { ...topic, ...guidance };
}

export function loadManifest(): Manifest {
	if (cached) return cached;
	const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
	const manifest = JSON.parse(raw) as Manifest;
	manifest.topics = manifest.topics.map(enrichTopic);
	cached = manifest;
	return cached;
}

export function getTopicById(id: string): Topic | undefined {
	const normalized = id.padStart(2, "0");
	return loadManifest().topics.find((t) => t.id === normalized);
}

export function getTopicBySlug(slug: string): Topic | undefined {
	return loadManifest().topics.find((t) => t.slug === slug);
}

export function resolveTopic(query: string): Topic | undefined {
	const trimmed = query.trim().toLowerCase();
	if (/^\d{1,2}$/.test(trimmed)) {
		return getTopicById(trimmed);
	}
	if (trimmed.includes("-") && getTopicBySlug(trimmed)) {
		return getTopicBySlug(trimmed);
	}
	return loadManifest().topics.find(
		(t) =>
			t.slug.includes(trimmed) ||
			t.title.toLowerCase().includes(trimmed) ||
			t.id === trimmed.padStart(2, "0"),
	);
}

export function expandDependencies(topic: Topic, includeSelf = true): Topic[] {
	const manifest = loadManifest();
	const byId = new Map(manifest.topics.map((t) => [t.id, t]));
	const visited = new Set<string>();
	const ordered: Topic[] = [];

	function visit(id: string) {
		if (visited.has(id)) return;
		visited.add(id);
		const t = byId.get(id);
		if (!t) return;
		for (const dep of t.dependencies) visit(dep);
		ordered.push(t);
	}

	if (includeSelf) visit(topic.id);
	else {
		for (const dep of topic.dependencies) visit(dep);
	}

	return ordered;
}

const FOUNDATION_TOPICS = ["01", "02", "08"];

const TASK_KEYWORDS: Record<string, string[]> = {
	module: ["06", "08", "12", "03", "48", "42"],
	gui: ["12", "13", "14", "15", "11"],
	dialplan: ["18", "16", "19", "21", "22"],
	ajax: ["15", "14"],
	hooks: ["16", "17"],
	database: ["09", "07", "10"],
	api: ["31", "32", "34"],
	graphql: ["31", "34"],
	rest: ["32", "34"],
	backup: ["26"],
	cli: ["23", "24"],
	test: ["37"],
	ucp: ["30"],
	signing: ["28", "46"],
	packaging: ["46", "47", "28"],
};

const TASK_PHRASES: Array<{ phrases: string[]; topicIds: string[]; weight: number }> =
	[
		{
			phrases: [
				"settings page",
				"config page",
				"admin page",
				"showpage",
				"show page",
			],
			topicIds: ["12", "13", "10"],
			weight: 5,
		},
		{
			phrases: [
				"bootstrap table",
				"data grid",
				"grid empty",
				"grid loading",
			],
			topicIds: ["14", "15"],
			weight: 5,
		},
		{
			phrases: [
				"doconfigpageinit",
				"do config page init",
				"load_view",
				"page.",
			],
			topicIds: ["12", "11"],
			weight: 4,
		},
		{
			phrases: ["fwconsole", "console command", "cli command"],
			topicIds: ["23", "24"],
			weight: 5,
		},
		{
			phrases: ["module.xml", "manifest", "menuitem"],
			topicIds: ["06", "07"],
			weight: 5,
		},
		{
			phrases: ["bmo", "install()", "uninstall()", "upgrade()"],
			topicIds: ["08", "03"],
			weight: 4,
		},
		{
			phrases: ["backup.php", "restore.php", "backup restore"],
			topicIds: ["26"],
			weight: 6,
		},
		{
			phrases: ["graphql resolver", "graphql api", "gql"],
			topicIds: ["31", "34"],
			weight: 5,
		},
		{
			phrases: ["rest provider", "rest api", "restapps"],
			topicIds: ["32", "34"],
			weight: 5,
		},
		{
			phrases: [
				"save fails",
				"doesn't persist",
				"does not persist",
				"not persisting",
				"persistence",
			],
			topicIds: ["07", "10", "09"],
			weight: 6,
		},
		{
			phrases: [
				"not loading",
				"blank page",
				"white screen",
				"page empty",
			],
			topicIds: ["12", "01", "44"],
			weight: 6,
		},
		{
			phrases: ["ajax error", "ajax 500", "ajax fails", "command not found"],
			topicIds: ["15", "44"],
			weight: 6,
		},
		{
			phrases: ["reload issue", "needreload", "apply config"],
			topicIds: ["24", "18"],
			weight: 5,
		},
		{
			phrases: ["manifest issue", "install order", "depends"],
			topicIds: ["06", "03"],
			weight: 5,
		},
		{
			phrases: ["new module", "scaffold", "create module", "from scratch"],
			topicIds: ["48", "06", "08", "42"],
			weight: 6,
		},
		{
			phrases: ["getconfig", "setconfig", "kvstore"],
			topicIds: ["10", "07"],
			weight: 5,
		},
		{
			phrases: ["ajaxrequest", "ajaxhandler", "ajax.php"],
			topicIds: ["15"],
			weight: 6,
		},
	];

const TARGET_AREA_TOPICS: Record<TargetArea, string[]> = {
	gui: ["12", "13", "14", "11"],
	ajax: ["15", "14"],
	dialplan: ["18", "16", "19", "21", "22"],
	database: ["07", "09", "10"],
	api: ["31", "32", "34"],
	ucp: ["30"],
	packaging: ["46", "47", "28"],
	backup: ["26"],
	cli: ["23", "24"],
	hooks: ["16", "17"],
};

const TASK_TYPE_HINTS: Record<TaskType, string[]> = {
	scaffold: ["create", "scaffold", "new module", "from scratch", "bootstrap", "generate"],
	feature: ["add", "implement", "support", "build", "integrate", "enable"],
	bugfix: [
		"fix",
		"bug",
		"broken",
		"error",
		"fails",
		"not working",
		"debug",
		"issue",
		"wrong",
	],
	refactor: ["refactor", "migrate", "modernize", "cleanup", "restructure"],
	docs: ["document", "readme", "explain", "describe"],
};

export function classifyTaskType(task: string): TaskType {
	const lower = task.toLowerCase();
	const scores: Record<TaskType, number> = {
		scaffold: 0,
		feature: 0,
		bugfix: 0,
		refactor: 0,
		docs: 0,
	};

	for (const [type, hints] of Object.entries(TASK_TYPE_HINTS) as Array<
		[TaskType, string[]]
	>) {
		for (const hint of hints) {
			if (lower.includes(hint)) scores[type] += hint.length > 4 ? 2 : 1;
		}
	}

	const ranked = (Object.entries(scores) as Array<[TaskType, number]>).sort(
		(a, b) => b[1] - a[1],
	);
	if (ranked[0][1] === 0) return "feature";
	return ranked[0][0];
}

function reasonForTopic(
	topic: Topic,
	taskType: TaskType,
	matchedBy: string[],
): string {
	if (matchedBy.length > 0) {
		return `Matched task keywords: ${matchedBy.join(", ")}`;
	}
	if (taskType === "scaffold" && topic.id === "48") {
		return "Needed for new module scaffolding and file layout";
	}
	if (taskType === "bugfix" && topic.commonBugPatterns?.length) {
		return `Relevant for debugging — common issues: ${topic.commonBugPatterns[0]}`;
	}
	return `Core guidance for ${topic.title.toLowerCase()}`;
}

function addScore(
	scores: Map<string, number>,
	matched: Map<string, Set<string>>,
	id: string,
	points: number,
	label: string,
) {
	scores.set(id, (scores.get(id) ?? 0) + points);
	const set = matched.get(id) ?? new Set<string>();
	set.add(label);
	matched.set(id, set);
}

export function suggestTopicsDetailed(
	task: string,
	targetArea?: TargetArea,
): SuggestedTopic[] {
	const manifest = loadManifest();
	const lower = task.toLowerCase();
	const scores = new Map<string, number>();
	const matched = new Map<string, Set<string>>();
	const taskType = classifyTaskType(task);

	for (const topic of manifest.topics) {
		let score = 0;
		const hits: string[] = [];

		if (lower.includes(topic.slug.replace(/-/g, " "))) {
			score += 5;
			hits.push(`slug:${topic.slug}`);
		}
		if (lower.includes(topic.title.toLowerCase())) {
			score += 4;
			hits.push(`title:${topic.title}`);
		}
		for (const word of topic.slug.split("-")) {
			if (word.length > 3 && lower.includes(word)) {
				score += 2;
				hits.push(`word:${word}`);
			}
		}
		for (const kw of topic.relatedKeywords ?? []) {
			if (lower.includes(kw.toLowerCase())) {
				score += 3;
				hits.push(`keyword:${kw}`);
			}
		}
		if (score > 0) {
			addScore(scores, matched, topic.id, score, hits.join("; "));
		}
	}

	for (const [key, ids] of Object.entries(TASK_KEYWORDS)) {
		if (lower.includes(key)) {
			for (const id of ids) {
				addScore(scores, matched, id, 3, `category:${key}`);
			}
		}
	}

	for (const { phrases, topicIds, weight } of TASK_PHRASES) {
		for (const phrase of phrases) {
			if (lower.includes(phrase)) {
				for (const id of topicIds) {
					addScore(scores, matched, id, weight, `phrase:${phrase}`);
				}
			}
		}
	}

	if (targetArea) {
		for (const id of TARGET_AREA_TOPICS[targetArea]) {
			addScore(scores, matched, id, 4, `target:${targetArea}`);
		}
	}

	if (taskType === "scaffold") {
		for (const id of ["48", "06", "08", "42", "03"]) {
			addScore(scores, matched, id, 2, "task-type:scaffold");
		}
	}
	if (taskType === "bugfix") {
		for (const id of ["44", "01"]) {
			addScore(scores, matched, id, 2, "task-type:bugfix");
		}
	}

	const ranked = [...scores.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
		.map(([id, score]) => {
			const topic = getTopicById(id)!;
			const matchedBy = [...(matched.get(id) ?? [])];
			return {
				topic,
				score,
				matchedBy,
				reason: reasonForTopic(topic, taskType, matchedBy),
			};
		})
		.filter((s) => s.topic);

	if (ranked.length === 0) {
		return manifest.topics
			.filter((t) => t.tier <= 2)
			.slice(0, 6)
			.map((topic) => ({
				topic,
				score: 1,
				matchedBy: ["fallback:foundation"],
				reason: "Default foundation topics when no keywords matched",
			}));
	}

	return ranked;
}

export function suggestTopicsForTask(task: string): Topic[] {
	return suggestTopicsDetailed(task).map((s) => s.topic);
}

function uniqueStrings(items: string[]): string[] {
	return [...new Set(items)];
}

function collectFromTopics(
	topics: Topic[],
	field: keyof TopicGuidance,
): string[] {
	return uniqueStrings(
		topics.flatMap((t) => {
			const guidance = getTopicGuidance(t.id);
			const value = guidance[field];
			return Array.isArray(value) ? value : [];
		}),
	);
}

function buildImplementationSteps(
	taskType: TaskType,
	suggested: SuggestedTopic[],
): string[] {
	const topicIds = suggested.map((s) => s.topic.id);
	const steps: string[] = [];

	if (taskType === "scaffold") {
		steps.push(
			"Review helloworld reference layout (topic 48) before generating files",
			"Create module.xml with metadata, depends, and menuitems",
			"Implement BMO class with install()/uninstall() — avoid legacy install.php",
			"Add thin page.{rawname}.php delegating to showPage()",
		);
	}
	if (taskType === "bugfix") {
		steps.push(
			"Reproduce the symptom and identify whether it is GUI, AJAX, database, or lifecycle",
			"Check logs: freepbx.log, PHP error log, browser network tab for ajax.php",
			"Verify file naming matches rawname and menuitem conventions (topic 42)",
		);
	}
	if (taskType === "feature") {
		steps.push(
			"Identify which surfaces change: manifest, BMO class, views, assets, or dialplan",
			"Declare schema in module.xml before adding persistence (topic 07)",
			"Keep business logic in the BMO class; views stay presentation-only",
		);
	}

	if (topicIds.includes("12")) {
		steps.push("Wire GUI via module.xml menuitems and showPage() view routing");
	}
	if (topicIds.includes("15") || topicIds.includes("14")) {
		steps.push(
			"Register AJAX commands in ajaxRequest() and handle in ajaxHandler()",
		);
	}
	if (topicIds.includes("07") || topicIds.includes("10")) {
		steps.push(
			"Confirm database schema or KVStore keys match what the UI reads/writes",
		);
	}
	if (topicIds.includes("18")) {
		steps.push("Implement dialplan hooks and plan for fwconsole reload");
	}
	if (topicIds.includes("26")) {
		steps.push("Add Backup.php and Restore.php for backup module integration");
	}
	if (topicIds.includes("23")) {
		steps.push("Add Console/{Rawname}.class.php for fwconsole commands");
	}

	steps.push("Follow naming conventions (topic 42) and code style (topic 43)");
	return uniqueStrings(steps).slice(0, 10);
}

function buildNextStep(
	taskType: TaskType,
	suggested: SuggestedTopic[],
): string {
	const top = suggested[0]?.topic;
	if (!top) {
		return "Call get_topic_details for topics 01, 02, and 08 before editing code";
	}
	if (taskType === "scaffold") {
		return `Call generate_module_plan or get_topic_details for topic ${top.id} (${top.slug}) with include_dependencies=true`;
	}
	if (taskType === "bugfix") {
		return `Inspect likely files for topic ${top.id}, then get_topic_details(query="${top.slug}", detail_level="detailed")`;
	}
	return `Read topic ${top.id} (${top.slug}) with get_topic_details before editing module files`;
}

export function buildTaskContextPlan(
	task: string,
	options: {
		taskType?: TaskType;
		targetArea?: TargetArea;
		includeDependencies?: boolean;
		rawname?: string;
	} = {},
): TaskContextPlan {
	const taskType = options.taskType ?? classifyTaskType(task);
	const suggested = suggestTopicsDetailed(task, options.targetArea);

	const prerequisiteIds = new Set<string>();
	for (const id of FOUNDATION_TOPICS) prerequisiteIds.add(id);
	if (options.includeDependencies !== false) {
		for (const { topic } of suggested) {
			for (const dep of topic.dependencies) prerequisiteIds.add(dep);
		}
	}

	const suggestedIds = new Set(suggested.map((s) => s.topic.id));
	const prerequisites = [...prerequisiteIds]
		.filter((id) => !suggestedIds.has(id))
		.map((id) => getTopicById(id)!)
		.filter(Boolean);

	const guidanceTopics = suggested.map((s) => s.topic);
	const likelyFiles = uniqueStrings(
		guidanceTopics.flatMap((t) =>
			resolveLikelyFiles(t.likelyFiles ?? [], options.rawname),
		),
	).slice(0, 12);

	const pitfalls = collectFromTopics(guidanceTopics, "commonPitfalls").slice(0, 6);
	const commonBugPatterns =
		taskType === "bugfix"
			? collectFromTopics(guidanceTopics, "commonBugPatterns").slice(0, 6)
			: [];
	const diagnosticChecklist =
		taskType === "bugfix"
			? collectFromTopics(guidanceTopics, "diagnosticChecklist").slice(0, 8)
			: [];

	return {
		taskType,
		task,
		targetArea: options.targetArea,
		recommendedTopics: suggested,
		prerequisites,
		likelyFiles,
		implementationSteps: buildImplementationSteps(taskType, suggested),
		pitfalls,
		commonBugPatterns,
		diagnosticChecklist,
		nextStep: buildNextStep(taskType, suggested),
	};
}
import {
	expandDependencies,
	getTopicById,
	type TargetArea,
	type TaskContextPlan,
	type TaskType,
	type Topic,
} from "./catalog.js";
import { resolveLikelyFiles } from "./topic-metadata.js";

export type DetailLevel = "summary" | "detailed" | "full-doc";

export type ModuleFeature =
	| "gui"
	| "database"
	| "ajax"
	| "dialplan"
	| "backup"
	| "ucp"
	| "api-rest"
	| "api-graphql"
	| "console"
	| "hooks";

export interface ModulePlanStep {
	order: number;
	action: string;
	topics: string[];
}

export interface ModulePlan {
	rawname: string;
	displayName: string;
	features: ModuleFeature[];
	fileTree: string[];
	likelyFiles: string[];
	topicReferences: Array<{ id: string; slug: string; title: string }>;
	namingTransforms: Record<string, string>;
	implementationOrder: ModulePlanStep[];
	implementationNotes: string[];
	pitfalls: string[];
}

const FEATURE_TOPICS: Record<ModuleFeature, string[]> = {
	gui: ["12", "13", "20", "36"],
	database: ["07", "09", "10"],
	ajax: ["15", "14"],
	dialplan: ["18", "16", "19", "21"],
	backup: ["26"],
	ucp: ["30"],
	"api-rest": ["32", "34"],
	"api-graphql": ["31", "34"],
	console: ["23"],
	hooks: ["16", "17"],
};

const BASE_SCAFFOLD_FILES = [
	"module.xml",
	"{Rawname}.class.php",
	"page.{rawname}.php",
	"views/default.php",
];

const FEATURE_FILES: Record<ModuleFeature, string[]> = {
	gui: ["views/form.php", "views/grid.php", "assets/js/{rawname}.js"],
	database: [],
	ajax: ["assets/js/{rawname}.js", "views/grid.php"],
	dialplan: [],
	backup: ["Backup.php", "Restore.php"],
	ucp: [
		"ucp/{Rawname}.class.php",
		"ucp/views/default.php",
		"ucp/assets/js/{rawname}.js",
	],
	"api-rest": ["Api/Rest/{Rawname}.php"],
	"api-graphql": ["Api/Gql/{Rawname}.php"],
	console: ["Console/{Rawname}.class.php"],
	hooks: [],
};

const FOUNDATION_TOPIC_IDS = ["01", "02", "03", "06", "08", "42", "43", "48"];

export function normalizeModuleFeatures(
	features: string[] = ["gui"],
): ModuleFeature[] {
	const aliases: Record<string, ModuleFeature> = {
		gui: "gui",
		database: "database",
		db: "database",
		ajax: "ajax",
		dialplan: "dialplan",
		backup: "backup",
		ucp: "ucp",
		rest: "api-rest",
		"api-rest": "api-rest",
		api: "api-rest",
		graphql: "api-graphql",
		"api-graphql": "api-graphql",
		gql: "api-graphql",
		console: "console",
		cli: "console",
		fwconsole: "console",
		hooks: "hooks",
	};

	const normalized: ModuleFeature[] = [];
	for (const raw of features) {
		const key = raw.trim().toLowerCase();
		const mapped = aliases[key];
		if (mapped && !normalized.includes(mapped)) normalized.push(mapped);
	}
	return normalized.length > 0 ? normalized : ["gui"];
}

export function generateModulePlan(
	rawname: string,
	features: string[] = ["gui"],
): ModulePlan {
	const normalizedFeatures = normalizeModuleFeatures(features);
	const displayName = rawname.charAt(0).toUpperCase() + rawname.slice(1);

	const fileSet = new Set<string>(BASE_SCAFFOLD_FILES);
	for (const feature of normalizedFeatures) {
		for (const file of FEATURE_FILES[feature]) fileSet.add(file);
	}

	const topicIdSet = new Set<string>(FOUNDATION_TOPIC_IDS);
	for (const feature of normalizedFeatures) {
		for (const id of FEATURE_TOPICS[feature]) topicIdSet.add(id);
	}

	const topicReferences = [...topicIdSet]
		.map((id) => getTopicById(id))
		.filter((t): t is Topic => Boolean(t))
		.sort((a, b) => a.id.localeCompare(b.id))
		.map((t) => ({ id: t.id, slug: t.slug, title: t.title }));

	const implementationOrder: ModulePlanStep[] = [
		{
			order: 1,
			action: "Create module.xml manifest with metadata, depends, and menuitems",
			topics: ["06", "42"],
		},
		{
			order: 2,
			action: "Implement BMO class with install()/uninstall() and core methods",
			topics: ["08", "03"],
		},
		{
			order: 3,
			action: "Add thin page entry and views",
			topics: ["12"],
		},
	];

	let stepOrder = 4;
	if (normalizedFeatures.includes("database")) {
		implementationOrder.push({
			order: stepOrder++,
			action: "Declare <database> schema in module.xml and wire persistence",
			topics: ["07", "09", "10"],
		});
	}
	if (normalizedFeatures.includes("ajax")) {
		implementationOrder.push({
			order: stepOrder++,
			action: "Add ajaxRequest()/ajaxHandler() and JS assets for dynamic UI",
			topics: ["15", "14"],
		});
	}
	if (normalizedFeatures.includes("dialplan")) {
		implementationOrder.push({
			order: stepOrder++,
			action: "Implement dialplan hooks and verify reload applies changes",
			topics: ["18", "24"],
		});
	}
	if (normalizedFeatures.includes("backup")) {
		implementationOrder.push({
			order: stepOrder++,
			action: "Add Backup.php and Restore.php integration classes",
			topics: ["26"],
		});
	}
	if (normalizedFeatures.includes("console")) {
		implementationOrder.push({
			order: stepOrder++,
			action: "Add fwconsole command class under Console/",
			topics: ["23"],
		});
	}
	if (normalizedFeatures.includes("ucp")) {
		implementationOrder.push({
			order: stepOrder++,
			action: "Add UCP module class, views, and assets under ucp/",
			topics: ["30"],
		});
	}
	if (
		normalizedFeatures.includes("api-rest") ||
		normalizedFeatures.includes("api-graphql")
	) {
		implementationOrder.push({
			order: stepOrder++,
			action: "Add API providers under Api/Rest or Api/Gql",
			topics: ["32", "31", "34"],
		});
	}

	implementationOrder.push({
		order: stepOrder,
		action: "Validate naming, code style, and run fwconsole ma install",
		topics: ["42", "43", "03"],
	});

	return {
		rawname,
		displayName,
		features: normalizedFeatures,
		fileTree: [...fileSet].map((f) =>
			f.replace(/\{Rawname\}/g, displayName).replace(/\{rawname\}/g, rawname),
		),
		likelyFiles: resolveLikelyFiles([...fileSet], rawname),
		topicReferences,
		namingTransforms: {
			rawname,
			className: displayName,
			pageFile: `page.${rawname}.php`,
			jsAsset: `assets/js/${rawname}.js`,
			namespace: `FreePBX\\modules\\${displayName}`,
		},
		implementationOrder,
		implementationNotes: [
			"Use helloworld as the reference layout — not legacy generator output with install.php",
			"Keep page.{rawname}.php thin; business logic lives in the BMO class",
			"No closing ?> in PHP files (topic 43)",
		],
		pitfalls: [
			"Do not rely on legacy install.php/uninstall.php for modern BMO modules",
			"Class name and rawname mismatch breaks autoloading",
			"menuitem display keys must match page.{display}.php filenames",
		],
	};
}

export function formatSuggestedTopicRef(
	id: string,
	slug: string,
	reason: string,
): string {
	return `${id}-${slug}: ${reason}`;
}

export function formatTaskContextPlan(
	plan: TaskContextPlan,
	level: DetailLevel = "summary",
): string {
	if (level === "summary") {
		const lines = [
			`Task: ${plan.task}`,
			`Type: ${plan.taskType}${plan.targetArea ? ` | Area: ${plan.targetArea}` : ""}`,
			"",
			"Recommended topics:",
			...plan.recommendedTopics.map((s) =>
				`  - ${formatSuggestedTopicRef(s.topic.id, s.topic.slug, s.reason)}`,
			),
		];

		if (plan.prerequisites.length > 0) {
			lines.push(
				"",
				"Prerequisites:",
				...plan.prerequisites.map(
					(t) => `  - ${t.id}-${t.slug}: ${t.title}`,
				),
			);
		}

		if (plan.likelyFiles.length > 0) {
			lines.push("", "Likely files:", ...plan.likelyFiles.map((f) => `  - ${f}`));
		}

		if (plan.implementationSteps.length > 0) {
			lines.push(
				"",
				"Implementation steps:",
				...plan.implementationSteps.map((s) => `  - ${s}`),
			);
		}

		if (plan.pitfalls.length > 0) {
			lines.push("", "Pitfalls:", ...plan.pitfalls.map((p) => `  - ${p}`));
		}

		if (plan.commonBugPatterns.length > 0) {
			lines.push(
				"",
				"Common bug patterns:",
				...plan.commonBugPatterns.map((p) => `  - ${p}`),
			);
		}

		if (plan.diagnosticChecklist.length > 0) {
			lines.push(
				"",
				"Diagnostic checklist:",
				...plan.diagnosticChecklist.map((d) => `  - ${d}`),
			);
		}

		lines.push("", `Next step: ${plan.nextStep}`);
		return lines.join("\n");
	}

	return JSON.stringify(
		{
			taskType: plan.taskType,
			task: plan.task,
			targetArea: plan.targetArea,
			recommendedTopics: plan.recommendedTopics.map((s) => ({
				id: s.topic.id,
				slug: s.topic.slug,
				title: s.topic.title,
				score: s.score,
				matchedBy: s.matchedBy,
				reason: s.reason,
			})),
			prerequisites: plan.prerequisites.map((t) => ({
				id: t.id,
				slug: t.slug,
				title: t.title,
			})),
			likelyFiles: plan.likelyFiles,
			implementationSteps: plan.implementationSteps,
			pitfalls: plan.pitfalls,
			commonBugPatterns: plan.commonBugPatterns,
			diagnosticChecklist: plan.diagnosticChecklist,
			nextStep: plan.nextStep,
		},
		null,
		2,
	);
}

export function formatModulePlan(plan: ModulePlan, level: DetailLevel): string {
	if (level === "full-doc") {
		return JSON.stringify(plan, null, 2);
	}

	const lines = [
		`Module plan: ${plan.rawname} (${plan.displayName})`,
		`Features: ${plan.features.join(", ")}`,
		"",
		"File tree:",
		...plan.fileTree.map((f) => `  ${f}`),
		"",
		"Naming:",
		...Object.entries(plan.namingTransforms).map(([k, v]) => `  ${k}: ${v}`),
		"",
		"Implementation order:",
		...plan.implementationOrder.map(
			(s) => `  ${s.order}. ${s.action} (topics: ${s.topics.join(", ")})`,
		),
		"",
		"Topic references:",
		...plan.topicReferences.map((t) => `  - [${t.id}] ${t.slug}: ${t.title}`),
		"",
		"Notes:",
		...plan.implementationNotes.map((n) => `  - ${n}`),
		"",
		"Pitfalls:",
		...plan.pitfalls.map((p) => `  - ${p}`),
	];

	return lines.join("\n");
}

export function formatTopicDetails(
	topic: Topic,
	guidance: {
		likelyFiles: string[];
		commonPitfalls?: string[];
		commonBugPatterns?: string[];
		diagnosticChecklist?: string[];
		implementationNotes?: string[];
	},
	level: DetailLevel,
	content?: string,
): string {
	if (level === "full-doc" && content) {
		return content;
	}

	if (level === "detailed") {
		return JSON.stringify(
			{
				id: topic.id,
				slug: topic.slug,
				title: topic.title,
				tier: topic.tier,
				complexity: topic.complexity,
				dependencies: topic.dependencies,
				file: topic.file,
				...guidance,
			},
			null,
			2,
		);
	}

	const lines = [
		`[${topic.id}] ${topic.title} (${topic.slug})`,
		`Tier ${topic.tier} | Complexity: ${topic.complexity} | Deps: ${topic.dependencies.join(", ") || "none"}`,
	];

	if (guidance.likelyFiles.length > 0) {
		lines.push(`Likely files: ${guidance.likelyFiles.join(", ")}`);
	}
	if (guidance.implementationNotes?.length) {
		lines.push(`Notes: ${guidance.implementationNotes.slice(0, 3).join("; ")}`);
	}
	if (guidance.commonPitfalls?.length) {
		lines.push(`Pitfalls: ${guidance.commonPitfalls.slice(0, 2).join("; ")}`);
	}

	return lines.join("\n");
}

export function taskTypeLabel(type: TaskType): string {
	return type;
}

export function targetAreaLabel(area: TargetArea): string {
	return area;
}
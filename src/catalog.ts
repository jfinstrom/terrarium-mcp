import fs from "node:fs";
import { MANIFEST_PATH } from "./paths.js";

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

let cached: Manifest | null = null;

export function loadManifest(): Manifest {
	if (cached) return cached;
	const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
	cached = JSON.parse(raw) as Manifest;
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

export function suggestTopicsForTask(task: string): Topic[] {
	const manifest = loadManifest();
	const lower = task.toLowerCase();
	const scores = new Map<string, number>();

	for (const topic of manifest.topics) {
		let score = 0;
		if (lower.includes(topic.slug.replace(/-/g, " "))) score += 5;
		if (lower.includes(topic.title.toLowerCase())) score += 4;
		for (const word of topic.slug.split("-")) {
			if (word.length > 3 && lower.includes(word)) score += 2;
		}
		if (score > 0) scores.set(topic.id, score);
	}

	for (const [key, ids] of Object.entries(TASK_KEYWORDS)) {
		if (lower.includes(key)) {
			for (const id of ids) {
				scores.set(id, (scores.get(id) ?? 0) + 3);
			}
		}
	}

	const ranked = [...scores.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 8)
		.map(([id]) => getTopicById(id)!)
		.filter(Boolean);

	if (ranked.length === 0) {
		return manifest.topics.filter((t) => t.tier <= 2).slice(0, 6);
	}

	const foundation = ["01", "02", "08"];
	const result: Topic[] = [];
	const seen = new Set<string>();
	for (const id of foundation) {
		const t = getTopicById(id);
		if (t && !seen.has(id)) {
			seen.add(id);
			result.push(t);
		}
	}
	for (const t of ranked) {
		if (!seen.has(t.id)) {
			seen.add(t.id);
			result.push(t);
		}
	}
	return result;
}
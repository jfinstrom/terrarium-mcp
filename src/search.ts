import fs from "node:fs";
import path from "node:path";
import { CONTEXT_DIR, SOURCES_DIR } from "./paths.js";
import type { Topic } from "./catalog.js";

export interface SearchMatch {
	file: string;
	line: number;
	text: string;
	score: number;
}

function walkDir(dir: string, extensions: Set<string>, maxFiles = 5000): string[] {
	const files: string[] = [];
	if (!fs.existsSync(dir)) return files;

	const stack = [dir];
	while (stack.length > 0 && files.length < maxFiles) {
		const current = stack.pop()!;
		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(current, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			if (entry.name === "node_modules" || entry.name === ".git") continue;
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(full);
			} else if (extensions.has(path.extname(entry.name).toLowerCase())) {
				files.push(full);
			}
		}
	}
	return files;
}

function scoreLine(line: string, terms: string[]): number {
	const lower = line.toLowerCase();
	let score = 0;
	for (const term of terms) {
		if (lower.includes(term)) score += term.length > 4 ? 3 : 1;
	}
	return score;
}

export function searchFiles(
	rootDir: string,
	query: string,
	extensions: Set<string>,
	limit = 20,
): SearchMatch[] {
	const terms = query
		.toLowerCase()
		.split(/\s+/)
		.filter((t) => t.length > 1);
	if (terms.length === 0) return [];

	const matches: SearchMatch[] = [];
	for (const file of walkDir(rootDir, extensions)) {
		let content: string;
		try {
			content = fs.readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const lines = content.split("\n");
		for (let i = 0; i < lines.length; i++) {
			const score = scoreLine(lines[i], terms);
			if (score > 0) {
				matches.push({
					file: path.relative(path.dirname(rootDir), file).replace(/\\/g, "/"),
					line: i + 1,
					text: lines[i].trim().slice(0, 200),
					score,
				});
			}
		}
	}

	return matches
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);
}

export function searchContext(query: string, limit = 15): SearchMatch[] {
	return searchFiles(
		CONTEXT_DIR,
		query,
		new Set([".md"]),
		limit,
	).map((m) => ({
		...m,
		file: `context/${m.file.replace(/^context\/?/, "")}`,
	}));
}

export function searchSources(query: string, limit = 20): SearchMatch[] {
	if (!fs.existsSync(SOURCES_DIR)) return [];
	return searchFiles(
		SOURCES_DIR,
		query,
		new Set([".php", ".md", ".xml", ".inc", ".json", ".yml", ".yaml"]),
		limit,
	).map((m) => ({
		...m,
		file: `sources/${m.file.replace(/^sources\/?/, "")}`,
	}));
}

export function formatTopicSummary(topic: Topic): string {
	return `[${topic.id}] Tier ${topic.tier}: ${topic.title} (${topic.slug}) — deps: ${topic.dependencies.join(", ") || "none"}`;
}
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Repository root (parent of src/ or dist/) */
export const ROOT_DIR = path.resolve(__dirname, "..");

export const CONTEXT_DIR = path.join(ROOT_DIR, "context");
export const MANIFEST_PATH = path.join(ROOT_DIR, "manifest", "topics.json");
export const SOURCES_DIR = path.join(ROOT_DIR, "sources");

export function contextUri(topicId: string, slug: string): string {
	return `terrarium://context/${topicId}-${slug}`;
}

export function resolveContextPath(relativePath: string): string {
	const resolved = path.resolve(ROOT_DIR, relativePath);
	if (!resolved.startsWith(CONTEXT_DIR)) {
		throw new Error("Path escapes context directory");
	}
	return resolved;
}

export function resolveSourcePath(relativePath: string): string {
	const normalized = relativePath.replace(/^sources[\\/]/, "");
	const resolved = path.resolve(SOURCES_DIR, normalized);
	if (!resolved.startsWith(SOURCES_DIR)) {
		throw new Error("Path escapes sources directory");
	}
	return resolved;
}
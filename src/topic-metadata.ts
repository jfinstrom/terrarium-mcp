export interface TopicGuidance {
	likelyFiles: string[];
	commonTasks?: string[];
	commonPitfalls?: string[];
	commonBugPatterns?: string[];
	diagnosticChecklist?: string[];
	relatedKeywords?: string[];
	implementationNotes?: string[];
}

const RAWNAME = "{rawname}";
const RAWNAME_CAP = "{Rawname}";

export const TOPIC_GUIDANCE: Record<string, TopicGuidance> = {
	"01": {
		likelyFiles: ["bootstrap.php (framework)", "admin/config.php"],
		commonPitfalls: [
			"Assuming globals exist before bootstrap completes",
			"Using admin bootstrap settings in CLI or AJAX contexts",
		],
		commonBugPatterns: [
			"Blank page when bootstrap settings are wrong",
			"Missing $db or $bmo after partial bootstrap",
		],
		relatedKeywords: ["bootstrap", "$amp_conf", "$astman", "$db", "$bmo"],
	},
	"02": {
		likelyFiles: [`${RAWNAME_CAP}.class.php`, "framework/amp_conf/amp_conf.php"],
		implementationNotes: [
			"Business logic belongs in the BMO class, not page entry files",
			"Use $this->FreePBX for framework services inside BMO classes",
		],
		relatedKeywords: ["BMO", "FreePBX class", "namespace FreePBX\\modules"],
	},
	"03": {
		likelyFiles: [
			`${RAWNAME_CAP}.class.php`,
			"module.xml",
			"install.php (legacy only)",
		],
		commonPitfalls: [
			"Relying on legacy install.php instead of BMO install()/uninstall()",
			"Forgetting fwconsole ma install/upgrade after manifest changes",
		],
		commonBugPatterns: [
			"Module installs but schema never created",
			"Upgrade hooks not running after version bump",
		],
		diagnosticChecklist: [
			"Check install() and uninstall() in the BMO class",
			"Verify module.xml version and depends",
			"Run fwconsole ma list and fwconsole ma upgrade",
		],
		relatedKeywords: ["install()", "uninstall()", "fwconsole ma", "module lifecycle"],
	},
	"06": {
		likelyFiles: ["module.xml"],
		implementationNotes: [
			"Declare menuitems, depends, and version in module.xml",
			"Keep manifest changes versioned to trigger upgrade paths",
		],
		commonPitfalls: [
			"Invalid or missing depends break install order",
			"Menu item keys must match page.{display}.php naming",
		],
		relatedKeywords: ["module.xml", "menuitems", "depends", "manifest"],
	},
	"07": {
		likelyFiles: ["module.xml", `${RAWNAME_CAP}.class.php`],
		implementationNotes: [
			"Declare schema in module.xml <database> section",
			"Use install() for data migrations beyond declarative schema",
		],
		commonPitfalls: [
			"Settings save in UI but do not persist — schema not declared",
			"Column types mismatch between XML and PHP accessors",
		],
		commonBugPatterns: [
			"Save succeeds but values missing after reload",
			"Table does not exist after install",
		],
		diagnosticChecklist: [
			"Inspect module.xml <database> tables and fields",
			"Confirm install() ran and tables exist in MySQL",
			"Check getConfig/setConfig or PDO usage matches schema",
		],
		relatedKeywords: ["module.xml database", "schema", "persistence", "save fails"],
	},
	"08": {
		likelyFiles: [`${RAWNAME_CAP}.class.php`],
		implementationNotes: [
			"Implement required BMO interface methods for your module type",
			"Keep showPage(), ajaxHandler(), and install logic in the class",
		],
		commonPitfalls: [
			"Class name/rawname mismatch breaks autoloading",
			"Missing namespace FreePBX\\modules\\{Rawname}",
		],
		relatedKeywords: ["BMO class", "showPage", "ajaxHandler", "install()"],
	},
	"09": {
		likelyFiles: [`${RAWNAME_CAP}.class.php`],
		commonPitfalls: [
			"Raw SQL without prepared statements",
			"Not using $this->Database from BMO context",
		],
		relatedKeywords: ["PDO", "Database", "prepared statements"],
	},
	"10": {
		likelyFiles: [`${RAWNAME_CAP}.class.php`],
		commonBugPatterns: [
			"getConfig returns empty after setConfig — wrong key or module scope",
			"Settings not scoped to correct module rawname",
		],
		diagnosticChecklist: [
			"Verify key names and module scope in getConfig/setConfig",
			"Check KVStore table entries for the module",
		],
		relatedKeywords: ["getConfig", "setConfig", "KVStore", "settings page"],
	},
	"11": {
		likelyFiles: [`${RAWNAME_CAP}.class.php`, `page.${RAWNAME}.php`],
		relatedKeywords: ["getReq", "importRequest", "Request_Helper"],
	},
	"12": {
		likelyFiles: [
			`page.${RAWNAME}.php`,
			"views/default.php",
			"views/form.php",
			`${RAWNAME_CAP}.class.php`,
		],
		implementationNotes: [
			"page.{rawname}.php should be thin — delegate to showPage()",
			"Use load_view() for templates; no business logic in views",
		],
		commonPitfalls: [
			"doConfigPageInit processing order — form handling runs before display",
			"display parameter must match module.xml menuitem key",
		],
		commonBugPatterns: [
			"Blank admin page — wrong display key or missing showPage()",
			"Form submits but page does not update",
		],
		diagnosticChecklist: [
			"Match config.php?display= to module.xml menuitem",
			"Check doConfigPageInit() and showPage() in BMO class",
			"Verify page.{rawname}.php includes and delegates correctly",
		],
		relatedKeywords: [
			"settings page",
			"config page",
			"showPage",
			"doConfigPageInit",
			"load_view",
		],
	},
	"13": {
		likelyFiles: [`${RAWNAME_CAP}.class.php`, "views/*.php"],
		relatedKeywords: ["getActionBar", "getRightNav", "action bar"],
	},
	"14": {
		likelyFiles: [
			"views/grid.php",
			`assets/js/${RAWNAME}.js`,
			`${RAWNAME_CAP}.class.php`,
		],
		commonBugPatterns: [
			"Grid empty — AJAX JSON shape mismatch",
			"Bootstrap Table columns do not match server response fields",
		],
		diagnosticChecklist: [
			"Inspect AJAX command returning grid JSON",
			"Compare column field names to PHP response keys",
			"Check browser network tab for ajax.php errors",
		],
		relatedKeywords: ["bootstrap table", "data grid", "grid empty", "getJSON"],
	},
	"15": {
		likelyFiles: [
			`${RAWNAME_CAP}.class.php`,
			`assets/js/${RAWNAME}.js`,
			"views/grid.php",
		],
		implementationNotes: [
			"Register commands in ajaxRequest() and handle in ajaxHandler()",
			"Return JSON via JsonResponseHandler-compatible structures",
		],
		commonPitfalls: [
			"Missing ajaxRequest() registration for command",
			"Wrong response format — must be JSON for grid/AJAX consumers",
		],
		commonBugPatterns: [
			"ajax error 500 — unhandled exception in ajaxHandler()",
			"Command not found — ajaxRequest() does not whitelist command",
			"Grid empty — JSON field names mismatch",
		],
		diagnosticChecklist: [
			"Verify ajax.php?module={rawname}&command={cmd} URL",
			"Check ajaxRequest() whitelist and ajaxHandler() switch",
			"Inspect PHP error log and browser network response body",
		],
		relatedKeywords: ["ajax.php", "ajaxRequest", "ajaxHandler", "ajax error"],
	},
	"16": {
		likelyFiles: [`${RAWNAME_CAP}.class.php`],
		relatedKeywords: ["hooks", "process_hooks", "GuiHooks"],
	},
	"18": {
		likelyFiles: [
			`${RAWNAME_CAP}.class.php`,
			"etc/extensions_custom.conf (generated)",
		],
		implementationNotes: [
			"Dialplan changes require reload/apply config",
			"Use hook classes or dialplan hooks per framework patterns",
		],
		commonBugPatterns: [
			"Dialplan not applied — missing fwconsole reload",
			"Context or extension not generated in output",
		],
		relatedKeywords: ["dialplan", "extensions", "reload", "dialplan injection"],
	},
	"23": {
		likelyFiles: [`Console/${RAWNAME_CAP}.class.php`, `${RAWNAME_CAP}.class.php`],
		implementationNotes: [
			"Register fwconsole commands in Console/{Rawname}.class.php",
		],
		relatedKeywords: ["fwconsole", "Console command", "CLI"],
	},
	"24": {
		likelyFiles: [`${RAWNAME_CAP}.class.php`],
		commonBugPatterns: [
			"Config changes not live — reload not triggered",
			"Apply config hangs or fails silently",
		],
		diagnosticChecklist: [
			"Run fwconsole reload and check for errors",
			"Verify needreload flag and post-reload hooks",
		],
		relatedKeywords: ["reload issue", "apply config", "needreload"],
	},
	"26": {
		likelyFiles: ["Backup.php", "Restore.php", `${RAWNAME_CAP}.class.php`],
		implementationNotes: [
			"Implement Backup.php and Restore.php for backup module integration",
		],
		relatedKeywords: ["Backup.php", "Restore.php", "backup restore"],
	},
	"30": {
		likelyFiles: [
			`ucp/${RAWNAME_CAP}.class.php`,
			"ucp/views/",
			"ucp/assets/",
		],
		relatedKeywords: ["UCP", "User Control Panel"],
	},
	"31": {
		likelyFiles: ["Api/Gql/", `${RAWNAME_CAP}.class.php`],
		relatedKeywords: ["GraphQL", "GraphQL resolver", "Gql"],
	},
	"32": {
		likelyFiles: ["Api/Rest/", `${RAWNAME_CAP}.class.php`],
		relatedKeywords: ["REST", "REST provider", "restapps"],
	},
	"37": {
		likelyFiles: ["tests/", `${RAWNAME_CAP}.class.php`],
		relatedKeywords: ["unit test", "phpunit"],
	},
	"42": {
		likelyFiles: [
			"module.xml",
			`${RAWNAME_CAP}.class.php`,
			`page.${RAWNAME}.php`,
		],
		implementationNotes: [
			"rawname is lowercase; class name is PascalCase matching rawname",
			"page file uses page.{menuitem}.php where menuitem often equals rawname",
		],
		relatedKeywords: ["naming", "rawname", "PascalCase"],
	},
	"43": {
		likelyFiles: ["*.php", "*.js"],
		commonPitfalls: ["Do not use closing ?> in PHP files"],
		relatedKeywords: ["code style", "PSR", "no closing ?>"],
	},
	"44": {
		likelyFiles: [`${RAWNAME_CAP}.class.php`],
		diagnosticChecklist: [
			"Check /var/log/asterisk/freepbx.log and PHP error log",
			"Enable whoops or inspect JsonResponseHandler output for AJAX",
		],
		relatedKeywords: ["error", "exception", "500", "blank page"],
	},
	"46": {
		likelyFiles: ["module.xml", ".github/workflows/"],
		relatedKeywords: ["packaging", "repo type", "distribution"],
	},
	"48": {
		likelyFiles: [
			"module.xml",
			`${RAWNAME_CAP}.class.php`,
			`page.${RAWNAME}.php`,
			"views/",
			`assets/js/${RAWNAME}.js`,
		],
		implementationNotes: [
			"Start from helloworld reference layout, not legacy generator output",
			"Use BMO install()/uninstall() — no install.php for modern modules",
		],
		commonTasks: [
			"Scaffold new module from rawname",
			"Add optional Backup/Restore, Console, Api, UCP directories",
		],
		relatedKeywords: ["new module", "scaffold", "module generator", "helloworld"],
	},
};

export function getTopicGuidance(topicId: string): TopicGuidance {
	return (
		TOPIC_GUIDANCE[topicId] ?? {
			likelyFiles: [`${RAWNAME_CAP}.class.php`, "module.xml"],
		}
	);
}

export function resolveLikelyFiles(
	patterns: string[],
	rawname?: string,
): string[] {
	if (!rawname) return patterns;
	const cap = rawname.charAt(0).toUpperCase() + rawname.slice(1);
	return patterns.map((p) =>
		p.replace(/\{Rawname\}/g, cap).replace(/\{rawname\}/g, rawname),
	);
}
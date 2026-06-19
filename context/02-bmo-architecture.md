# BMO Architecture — Big Module Object

## Scope

The `FreePBX` class and its helper inheritance chain form the central service locator for all module and framework code. Source: `libraries/BMO/`.

---

## Class Hierarchy

```
DB_Helper          // kvstore: getConfig, setConfig, delConfig
  └── Self_Helper  // __get/__call autoloading of modules and BMO libs
        └── Request_Helper  // getReq, getReqUnsafe, importRequest
              └── FreePBX_Helpers  // empty passthrough class
                    └── FreePBX    // singleton service locator
```

Module classes:

```
FreePBX_Helpers implements BMO
  └── FreePBX\modules\Modulename
```

---

## Singleton Access Patterns

```php
// Explicit singleton
$fpbx = FreePBX::create();

// Static module shortcut (delegates to create()->$name)
$core = FreePBX::Core;

// From within a BMO module (via Self_Helper __get)
$this->Database;   // → FreePBX::create()->Database
$this->Modules;    // → FreePBX::create()->Modules
$this->Hooks;      // → FreePBX::create()->Hooks
```

**Constraint:** Never `new FreePBX()` from module code. Never `new DB_Helper()`.

---

## `FreePBX` Constructor Behavior

```php
public function __construct(&$conf = null) {
	if (empty($conf)) {
		global $amp_conf;
		$conf = $amp_conf;
	}
	global $astman;
	self::$conf = $conf;
	self::$obj = $this;

	// Preload default libraries
	foreach (["Database", "Modules"] as $lib) {
		$this->$lib = new \FreePBX\$lib($this);
	}
	$this->astman = $astman;
}
```

- Stores config in `FreePBX::$conf` (static)
- Assigns `$this->astman` from global
- Preloads only `Database` and `Modules`; all other BMO libs load on demand

---

## Autoloading (`Self_Helper`)

### Resolution Order

1. Check if property already exists on `FreePBX::create()`
2. Validate no path traversal in class name (`/`, `..` rejected)
3. `loadObject($var)` — search BMO library dir, then active module dirs
4. Clean module name via `Modules::cleanModuleName()`
5. Resolve class: `\FreePBX\modules\{Name}` → `\FreePBX\{Name}` → bare class
6. Instantiate with `new $class($this->FreePBX)` or with `__call` args

### Module Class File Convention

| rawname | Class File | Class Name | Namespace |
|---------|-----------|------------|-----------|
| `helloworld` | `Helloworld.class.php` | `Helloworld` | `FreePBX\modules` |
| `call-recording` | `CallRecording.class.php` → `CalldashRecording` | `CalldashRecording` | `FreePBX\modules` |

Hyphenated rawnames: `-` becomes `dash` in filename, removed in class resolution.

### `injectClass()` — Forced Load

Used by `Ajax.class.php` to load a specific file path before autoload:

```php
$this->injectClass($ucMod, $file);
```

---

## Default Preloaded Libraries

| Library | Class | Purpose |
|---------|-------|---------|
| `Database` | `FreePBX\Database extends \PDO` | Primary MySQL PDO connection |
| `Modules` | `FreePBX\Modules extends DB_Helper` | Module discovery, XML, status |

All other framework services load lazily:

| Service | Class File | Common Use |
|---------|-----------|------------|
| `Hooks` | `Hooks.class.php` | Inter-module hook dispatch |
| `Ajax` | `Ajax.class.php` | AJAX request handler |
| `Config` | via `Freepbx_conf` | `$amp_conf` accessor |
| `View` | `View.class.php` | Timezone, view helpers |
| `DialplanHooks` | `DialplanHooks.class.php` | Dialplan generation |
| `GuiHooks` | `GuiHooks.class.php` | Page init orchestration |
| `WriteConfig` | `WriteConfig.class.php` | Asterisk conf file writing |
| `Cron` | `Cron.class.php` | Cron job management |
| `Performance` | `Performance.class.php` | Timing stamps |

---

## Backwards Compatibility Aliases

Defined in `FreePBX.class.php`:

```php
class_alias('FreePBX\BMO', 'BMO');
class_alias('FreePBX\FreePBX_Helpers', 'FreePBX_Helpers');
class_alias('FreePBX\Request_Helper', 'Request_Helper');
class_alias('FreePBX\DB_Helper', 'DB_Helper');
class Database extends FreePBX\Database {};
```

Modules may use `implements BMO` (unqualified) or `implements \BMO`.

---

## `BMO` Interface Contract

Required methods (from `BMO.interface.php`):

```php
namespace FreePBX;
interface BMO {
	public function install();
	public function uninstall();
}
```

Documented but optional/expansion methods (not in interface body but expected by framework subsystems):

| Method | Required By | Purpose |
|--------|-------------|---------|
| `doConfigPageInit($page)` | `GuiHooks` | Pre-page form processing |
| `ajaxRequest($command, &$settings)` | `Ajax` | Authorize AJAX commands |
| `ajaxHandler()` | `Ajax` | Execute AJAX commands |
| `getActionBar($request)` | GUI framework | Bottom action buttons |
| `getRightNav($request)` | GUI framework | Right sidebar nav |
| `showPage()` / `showPage($request)` | `page.*.php` | Page content rendering |
| `myGuiHooks()` | `Hooks` | Declare GUI hook targets |
| `myDialplanHooks()` | `Hooks` | Declare dialplan hook participation |
| `myConfigPageInits()` | `Hooks` | Declare config page init hooks |
| `doDialplanHook(&$ext, $engine, $priority)` | `DialplanHooks` | Inject dialplan |
| `genConfig()` | Config reload | Generate config arrays |
| `writeConfig($config)` | Config reload | Write Asterisk conf files |

**Critical:** Missing `doConfigPageInit()` causes framework error even though not in `BMO` interface.

---

## Module Constructor Pattern

```php
namespace FreePBX\modules;

use BMO;
use FreePBX_Helpers;
use PDO;

class Helloworld extends FreePBX_Helpers implements BMO
{
	public $FreePBX = null;

	public function __construct($freepbx = null)
	{
		if ($freepbx == null) {
			throw new Exception("Not given a FreePBX Object");
		}
		$this->FreePBX = $freepbx;
		$this->Database = $freepbx->Database;
	}
}
```

- Framework passes `$freepbx` (the BMO singleton) on instantiation
- Store `$this->Database` reference for PDO operations
- `install()` called with `($BMO, true)` flag before marking module installed
- Exception in `install()` → module NOT marked installed
- Exception in `uninstall()` → module IS marked uninstalled (with warning)

---

## `FreePBX::reset()`

```php
FreePBX::reset(); // nulls self::$obj, calls Modules::reset()
```

Used exclusively in unit tests to reset singleton state.

---

## Namespace Rules

- **Required:** `namespace FreePBX\modules;` on all BMO module classes
- **Failure mode:** Missing namespace causes class collision bugs across modules
- Module Console commands: `Console\Modulename.class.php` under module dir
- UCP classes: `ucp/Modulename.class.php` (separate namespace conventions)

---

## Anti-Patterns

| Pattern | Why Forbidden |
|---------|---------------|
| `new FreePBX()` | Breaks singleton; use `FreePBX::create()` |
| `new DB_Helper()` | Constructor throws by design |
| Class loaded before AJAX handler | `Ajax::doRequest` throws if `class_exists(ucfirst($module))` |
| Path in autoload name | `Self_Helper` rejects `/` and `..` |
| Non-namespaced module class | Cross-module class name collisions |
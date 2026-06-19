# Hooks System

## Scope

Inter-module extension points: GUI hooks, dialplan hooks, config page inits, and `module.xml` declarative hooks. Orchestrated by `Hooks`, `GuiHooks`, `DialplanHooks`, `FileHooks` classes.

---

## Hook Cache

Built by `Hooks::updateBMOHooks()`, stored in KVStore:

```php
FreePBX::Hooks()->updateBMOHooks();  // rebuild after module install/enable
$hooks = FreePBX::Hooks()->getAllHooks();
```

Cache structure:

```php
[
	'GuiHooks'        => [...],
	'DialplanHooks'   => [...],
	'ConfigPageInits' => [...],
	'ConfigFiles'     => [...],   // modules with writeConfig()
	'ModuleHooks'     => [...],   // module.xml declarative hooks
]
```

---

## Hook Discovery (BMO Methods)

During `updateBMOHooks()`, framework scans all active BMO modules:

| Method | Cache Key | Return Value |
|--------|-----------|--------------|
| `myGuiHooks()` | `GuiHooks` | Array of display names to hook, or `INTERCEPT` entries |
| `myDialplanHooks()` | `DialplanHooks` | `true` (priority 500), `false` (skip), or int priority |
| `myConfigPageInits()` | `ConfigPageInits` | Array of display names |
| `writeConfig()` exists | `ConfigFiles` | Class name added to list |

---

## Declarative Hooks (`module.xml`)

```xml
<hooks>
	<core namespace="FreePBX\modules" priority="500" class="Core">
		<method callingMethod="doConfigPageInit" priority="500">myHookMethod</method>
	</core>
</hooks>
```

| XML Attribute | Purpose |
|---------------|---------|
| `namespace` | PHP namespace of target class |
| `class` | Target class (defaults to element name) |
| `priority` | Execution order (lower = earlier; collisions auto-increment) |
| `callingMethod` | Method on target that triggers this hook |
| `static` | `true` for static handler invocation |

Processed into `ModuleHooks[$targetClass][$callingMethod][$hookingModule][$priority]`.

---

## Config Page Init Hooks

### `doConfigPageInit($page)` — Owning Module

Required on every BMO module. Called first for the page owner:

```php
public function doConfigPageInit($page)
{
	// Process $_POST/$_GET mutations before page renders
}
```

### `myConfigPageInits()` — Observer Modules

```php
public function myConfigPageInits()
{
	return ['extensions', 'users'];  // pages to observe
}
```

### Execution Order (`GuiHooks::doConfigPageInits`)

```
1. Legacy pre-hooks for owning module's display
2. Owning module doConfigPageInit() via doBMOConfigPage()
3. Legacy post-hooks from other modules
4. BMO ConfigPageInits hooks from other modules
```

---

## GUI Hooks

### Standard Hook (Inject into Another Page)

```php
public function myGuiHooks()
{
	return ['extensions'];
}

public function doGuiHook(&$currentcomponent, $thispage)
{
	// Modify $currentcomponent on extensions page
}
```

`GuiHooks::doGUIHooks($thispage, $currentcomponent)` dispatches to registered modules.

### INTERCEPT Hook (Replace Page)

```php
public function myGuiHooks()
{
	return ['INTERCEPT' => 'targetdisplay'];
}
```

When `GuiHooks::needsIntercept()` matches, `doIntercept()` runs instead of `include(page.*.php)`.

---

## Dialplan Hooks

```php
public function myDialplanHooks()
{
	return true;  // hook at priority 500
	// return 300;  // custom priority
	// return false; // do not hook
}

public function doDialplanHook(&$ext, $engine, $priority)
{
	// Inject into dialplan $ext object
}
```

### Priority Merge (`DialplanHooks::getAllHooks`)

BMO hooks merged into legacy hook array sorted by priority:

| Source | Default Priority |
|--------|-----------------|
| `{mod}_get_config` | 100 |
| `module.xml` get_config methods | varies |
| BMO `myDialplanHooks() == true` | 500 |
| `{mod}_hookGet_config` | 600 |

### Legacy Dialplan Functions

Still supported:

```php
function mymodule_get_config($engine) { /* ... */ }
function mymodule_hookGet_config($engine) { /* ... */ }
```

---

## Module Hook Dispatch (`Hooks::processHooks`)

Backtrace-driven: hooks registered against the **calling class and method**:

```php
// Inside SomeClass::someMethod():
$responses = $this->FreePBX->Hooks()->processHooks($payload);
// Returns: ['HookingModule' => $returnValue, ...]
```

### `processHooksByClassMethod($class, $method, $args)`

Direct invocation without backtrace:

```php
$results = FreePBX::Hooks()->processHooksByClassMethod(
	'FreePBX\Destinations',
	'getModuleDestinations',
	[$index]
);
```

### `processHooksByModule($module, ...$args)`

Single module's hook response:

```php
$info = FreePBX::Hooks()->processHooksByModule('mymodule', $index);
```

---

## Config File Hooks (`FileHooks`)

Modules with `writeConfig()` method auto-registered in `ConfigFiles` cache.

Executed during `fwconsole reload` via `FileHooks::processFileHooks()`:

```
Legacy: {mod}_conf class → get_filename() → generateConf()
BMO:    genConfig() → writeConfig($tmpconf)
```

---

## Hook Execution Constraints

| Rule | Detail |
|------|--------|
| One response per module | `processHooksByClassMethod` throws on duplicate module response |
| Priority sorting | `ksort()` on priority; collisions increment |
| i18n domain | `modgettext::push_textdomain()` per hooking module |
| Performance | `Performance->Stamp()` wraps each hook call |
| Missing class | Exception `'Cant find {class}'` or 404 retry with cache rebuild |
| Multiple dialplan hooks | `DialplanHooks` throws "Multiple hooks unimplemented" for array priority |

---

## Cache Invalidation

Rebuild required after:
- Module install/uninstall/enable/disable
- `module.xml` hook changes
- `fwconsole reload` (triggers `updateBMOHooks` indirectly)

```php
FreePBX::Hooks()->updateBMOHooks();
```

---

## System Hooks (Incron)

```php
FreePBX::Hooks()->runModuleSystemHook($moduleName, $hookname, $params);
```

Requires `/etc/incron.d/sysadmin` — spool-based system event hooks.

---

## Constraints

- `doConfigPageInit()` mandatory on owning module (not in BMO interface but enforced by GuiHooks)
- `doGuiHook()` must exist if module registers GUI hooks
- `doDialplanHook()` must exist if `myDialplanHooks()` returns non-false
- Hook cache stale after module changes until `updateBMOHooks()`
- `preloadBMOModules()` during cache rebuild — expensive, not every page load
- Commercial modules: exceptions in `doBMOConfigPage` silently caught for licensed modules
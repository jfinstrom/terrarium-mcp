# Dialplan Injection

## Scope

Adding Asterisk dialplan contexts and extensions during `fwconsole reload` / Apply Config. BMO via `doDialplanHook()`, legacy via `{mod}_get_config()`. The deprecated `retrieve_conf` script now forwards to `fwconsole reload --dont-reload-asterisk`.

---

## Trigger Flow

```
User clicks "Apply Config" / fwconsole reload
  → Reload::reload() in Console/Reload.class.php
  → Bootstrap already complete (fwconsole includes freepbx.conf)
  → Symlink/copy assets, compile LESS, updateBMOHooks()
  → Build base dialplan in $ext object (extensions class)
  → DialplanHooks::getAllHooks($active_modules)
  → DialplanHooks::processHooks($engine, $hooks)
  → WriteConfig::writeConfig() → extensions_additional.conf
  → FileHooks::processFileHooks()
  → asterisk reload (unless --dont-reload-asterisk)
```

See `24-reload-apply-config.md` for full pipeline.

---

## BMO Dialplan Hook Declaration

```php
public function myDialplanHooks()
{
	return true;   // participate at priority 500
	// return 300;  // custom priority (lower = earlier)
	// return false; // opt out
}
```

Discovered by `Hooks::updateBMOHooks()` → cached in `DialplanHooks` array.

---

## BMO Dialplan Injection

```php
public function doDialplanHook(&$ext, $engine, $priority)
{
	$modulename = 'helloworld';

	$fcc = new \featurecode($modulename, 'helloworld');
	$hw_fc = $fcc->getCodeActive();
	unset($fcc);

	$id = 'app-helloworld';
	$ext->addInclude('from-internal-additional', $id);

	$ext->add($id, $hw_fc, '', new \ext_goto('1', 's', 'app-helloworld-playback'));

	$id = 'app-helloworld-playback';
	$c = 's';
	$ext->add($id, $c, 'label', new \ext_answer());
	$ext->add($id, $c, '', new \ext_wait(1));
	$ext->add($id, $c, '', new \ext_playback('hello-world'));
	$ext->add($id, $c, '', new \ext_playback('demo-congrats'));
	$ext->add($id, $c, 'hangup', new \ext_hangup());
}
```

### Parameters

| Param | Type | Content |
|-------|------|---------|
| `$ext` | `extensions` object | Dialplan builder (by reference) |
| `$engine` | string | Always `'asterisk'` |
| `$priority` | int | Hook priority from `myDialplanHooks()` |

---

## `$ext` API Patterns

```php
// Include sub-context in from-internal-additional
$ext->addInclude('from-internal-additional', 'my-context');

// Add extension
$ext->add($context, $extension, $label, $application);

// Common applications (ext_* classes)
new \ext_answer()
new \ext_wait(1)
new \ext_playback('filename')
new \ext_goto('1', 's', 'target-context')
new \ext_hangup()
new \ext_noop('${CALLERID(num)}')
new \ext_gosub('sub-context,s,1')
```

Context names convention: `app-{modulename}`, `app-{modulename}-{function}`.

---

## Priority Execution Order

`DialplanHooks::getAllHooks()` merges and `ksort()` by priority:

| Priority | Typical Source |
|----------|---------------|
| 100 | `{mod}_get_config()` legacy function |
| 300–499 | Custom BMO priorities |
| 500 | BMO `myDialplanHooks() == true` (default) |
| 600 | `{mod}_hookGet_config()` legacy function |
| XML-defined | `module.xml` `<methods><get_config>` |

Lower priority numbers execute first.

---

## Legacy Dialplan Hooks

```php
// functions.inc.php
function mymodule_get_config($engine)
{
	global $ext;
	// Modify $ext
}
```

Registered automatically at priority 100 if function exists.

```php
function mymodule_hookGet_config($engine) { /* priority 600 */ }
```

---

## `DialplanHooks::processHooks()` Dispatch

```php
foreach ($hooks as $pri => $hook) {
	foreach ($hook as $module => $cmds) {
		foreach ($cmds as $cmd) {
			if (isset($cmd['function'])) {
				$func($engine);           // legacy
			} elseif (isset($cmd['Class'])) {
				$mod->doDialplanHook($ext, $engine, $pri);  // BMO
			}
		}
	}
}
```

- Legacy: calls function with `$engine` only (uses `global $ext`)
- BMO: passes `$ext` by reference directly
- i18n: `modgettext::push_textdomain($module)` per module
- Performance: `Performance->Stamp()` around each hook

---

## Feature Code Integration

```php
$fcc = new \featurecode('modulename', 'featurename');
$code = $fcc->getCodeActive();  // custom or default code
unset($fcc);

$ext->add($context, $code, '', new \ext_goto('1', 's', 'handler-context'));
```

Feature codes registered in `install()` via `featurecode` class `update()`.

---

## Include Chain

Most module contexts hook into `from-internal-additional`:

```php
$ext->addInclude('from-internal-additional', 'app-mymodule');
```

Base `from-internal` includes `from-internal-additional` — do not modify `from-internal` directly.

---

## Engine Parameter

Always `'asterisk'`. Historically supported multiple engines; only Asterisk remains. Pass to legacy functions for compatibility.

---

## Error Handling

| Condition | Behavior |
|-----------|----------|
| `myDialplanHooks()` true but no `doDialplanHook()` | `dbug()` HANDLED-ERROR, skip |
| Legacy function missing (commercial) | Skip silently if commercial license |
| Legacy function missing (OSS) | `dbug()` HANDLED-ERROR, skip |
| Non-numeric priority | Exception thrown |
| Array priority (multiple) | Exception "Multiple hooks unimplemented" |

---

## Testing

```bash
fwconsole reload
asterisk -rx "dialplan show app-helloworld"
asterisk -rx "dialplan show from-internal-additional"
```

Verify feature code registration:

```bash
asterisk -rx "dialplan show {featurecode}"
```

---

## Constraints

- `$ext` is global in legacy hooks, parameter in BMO — do not mix patterns in same module
- Dialplan changes require Apply Config (`fwconsole reload`) to take effect
- Playback files must exist in Asterisk sounds directory
- Context/extension names must not collide with other modules — prefix with `app-{rawname}`
- `doDialplanHook` called once per reload, not per page view
- Commercial module functions may be absent without license — dialplan hook silently skipped
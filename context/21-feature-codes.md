# Feature Codes

## Scope

Configurable DTMF codes that route to module dialplan contexts. Managed via `featurecode` class and `featurecodes` database table.

---

## Database Table: `featurecodes`

| Column | Purpose |
|--------|---------|
| `modulename` | Module rawname |
| `featurename` | Unique feature identifier within module |
| `description` | GUI display label |
| `helptext` | Help bubble text |
| `defaultcode` | Factory default code (e.g., `*99`) |
| `customcode` | Admin-overridden code |
| `enabled` | 0=disabled, 1=enabled |
| `providedest` | 1=expose as dialplan destination |
| `depend` | Dependency string |

---

## `module.xml` Declaration

```xml
<featurecodes>
	<helloworld>
		<default>*99</default>
		<description>Hello World Demo</description>
		<providedest />
	</helloworld>
</featurecodes>
```

Registered to DB during module install/upgrade.

---

## `featurecode` Class

```php
$fcc = new \featurecode('helloworld', 'helloworld');
$fcc->setDescription('Hello World Demo');
$fcc->setDefaultCode('*99');
$fcc->setProvidesDest(true);  // if <providedest />
$fcc->update();
unset($fcc);
```

Typically called in `install()`:

```php
public function install()
{
	$fcc = new \featurecode('helloworld', 'helloworld');
	$fcc->setDescription('Hello World');
	$fcc->setDefaultCode('*99');
	$fcc->update();
}
```

---

## Key Methods

| Method | Purpose |
|--------|---------|
| `setDescription($text)` | GUI label |
| `setHelpText($text)` | Help bubble |
| `setDefaultCode($code)` | Default `*XX` code |
| `setCustomCode($code)` | Force custom code |
| `setEnabled(true/false)` | Enable/disable |
| `setProvidesDest(true/false)` | Register as destination |
| `setDepend($dep)` | Feature dependency |
| `update()` | INSERT or UPDATE to DB |
| `getCodeActive()` | Returns customcode if set, else defaultcode |
| `getCode()` | Raw active code |
| `init()` | Load from DB |

---

## Reading Active Code in Dialplan

```php
public function doDialplanHook(&$ext, $engine, $priority)
{
	$fcc = new \featurecode('helloworld', 'helloworld');
	$fc = $fcc->getCodeActive();
	unset($fcc);

	if (empty($fc)) {
		return;
	}

	$ext->add('app-helloworld', $fc, '', new \ext_goto('1', 's', 'app-helloworld-playback'));
}
```

`getCodeActive()` returns custom code if admin set one, otherwise default.

Missing code returns: `** MISSING FEATURE CODE modulename:featurename **`

---

## Override File

`/etc/asterisk/freepbx_featurecodes.conf` (INI format):

```ini
[helloworld]
helloworld = *88
```

Overrides `defaultcode` in DB on `featurecode` init. Parsed in `featurecode::__construct()`.

---

## Procedural Helper Functions

```php
// Get active code string
$code = featurecodes_getFeatureCode('modulename', 'featurename');

// List enabled features for module
$features = featurecodes_getModuleFeatures('modulename');

// Delete all features for module (uninstall)
featurecodes_delModuleFeatures('modulename');

// Delete single feature
featurecodes_delFeatureCode('modulename', 'featurename');
```

From `featurecodes.functions.php` — loaded on bootstrap.

---

## GUI Administration

Admin → Admin → Feature Codes — lists all registered codes. Admins can:
- Change code assignment (customcode)
- Enable/disable features
- View module grouping

Changes take effect on next dialplan reload.

---

## Destination Integration

When `providedest = 1` (set via `setProvidesDest(true)` or `<providedest />` in `module.xml`):

The feature is flagged in the `featurecodes` table as eligible for destination registration. The `featurecode` class documents this as "provide a featurecode destination for this code to modules."

**Unverified in cloned sources:** The exact destination string format used in dropdowns is not defined in framework or helloworld repos. Destination lists are built per-module via `{mod}_destinations()` functions (see `22-destinations-framework.md`). Feature-code-as-destination handling likely lives in the `core` module (not cloned here). Do not assume `{modulename},{featurename}` without verifying in the owning module's destination function.

---

## Uninstall Cleanup

```php
public function uninstall()
{
	featurecodes_delModuleFeatures('helloworld');
}
```

Or delete individual features with `featurecodes_delFeatureCode()`.

---

## Constraints

- Feature name must be unique within module, not globally
- Codes typically `*XX` format — validate for conflicts with other features
- `update()` requires prior `init()` or setter calls that trigger `init(1)`
- Always `unset($fcc)` after use — object holds DB state
- Dialplan must be reloaded after code changes
- `getCodeActive()` in dialplan hook — check for empty/missing before `ext->add()`
- Feature code extension added to module's own context, not globally
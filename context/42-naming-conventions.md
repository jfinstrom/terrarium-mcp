# Naming Conventions

## Scope

Identifier rules for FreePBX module development: rawname, class names, files, namespaces, GUI routing, and legacy function prefixes. Sources: `Modules.class.php::cleanModuleName()`, `Self_Helper.class.php`, `helloworld/`, `freepbx-gists/moduleclass.stub.php`.

---

## rawname

The machine identifier — lowercase, no spaces, matches directory name.

```xml
<rawname>helloworld</rawname>
```

| Rule | Example |
|------|---------|
| Lowercase alphanumeric | `core`, `sipsettings`, `helloworld` |
| Hyphens in name → `dash` in class | `my-module` → class `Mydash` via `cleanModuleName()` |
| Directory path | `{AMPWEBROOT}/admin/modules/{rawname}/` |

```php
// Modules::cleanModuleName()
$module = str_replace("-", "dash", $module);
$module = ucfirst(strtolower($module));  // helloworld → Helloworld
```

---

## BMO Class Name

| rawname | Class | File |
|---------|-------|------|
| `helloworld` | `Helloworld` | `Helloworld.class.php` |
| `myapp` | `Myapp` | `Myapp.class.php` |
| `my-module` | `Mydash` | `Mydash.class.php` |

**Pattern:** `ucfirst(strtolower(rawname))` with hyphens replaced by `dash`.

Autoload search path:

```
admin/modules/{rawname}/{Classname}.class.php
```

`Self_Helper::loadObject()` scans active modules for `{cleanModuleName}.class.php`.

---

## Namespace

BMO module classes use:

```php
namespace FreePBX\modules;
```

Verified in `helloworld/Helloworld.class.php` and `freepbx-gists/moduleclass.stub.php`.

### Sub-namespace PSR-4 autoload

```
FreePBX\modules\{Module}\{SubPath}\{Class}
→ admin/modules/{lowercase_module}/{SubPath}/{Class}.php
```

Example from `functions.inc.php` comment:

```
FreePBX\modules\Ucp\Widgets\Ponies
→ admin/modules/ucp/Widgets/Ponies.php
```

### API namespaces

| Type | Namespace |
|------|-----------|
| Module GQL | `FreePBX\modules\{Module}\Api\Gql` |
| Module REST | `FreePBX\modules\{Module}\Api\Rest` |
| Framework GQL | `FreePBX\Api\Gql` |
| Framework REST | `FreePBX\Api\Rest` |
| Console command | `FreePBX\Console\Command` |

### Backup/Restore

```php
namespace FreePBX\modules\Helloworld;  // separate files, not main BMO class
```

---

## BMO Access Name

```php
FreePBX::Helloworld    // cleanModuleName → ucfirst
FreePBX::create()->Helloworld
```

`Self_Helper` stores loaded instance on `FreePBX` singleton. Case normalized via `cleanModuleName($var, false)` for autoload lookup.

---

## GUI Page Files

| Pattern | Purpose |
|---------|---------|
| `page.{display}.php` | Page entry point |
| `views/{name}.php` | View templates |
| `assets/js/`, `assets/css/` | Static assets |

Display name from `module.xml` `<menuitems>`:

```xml
<menuitems>
	<helloworld>Hello World</helloworld>
</menuitems>
```

Routes to `config.php?display=helloworld` → `page.helloworld.php`.

`Modules::getClassName($page)` maps display name back to owning module class.

---

## Legacy Function Prefix

Non-BMO modules use `{rawname}_` function prefix:

```php
function helloworld_destinations() { }
function helloworld_get_config($engine) { }
function helloworld_hookGet_config($engine) { }
```

Loaded via `functions.inc.php` in module directory.

---

## Database / KVStore

| Item | Convention |
|------|------------|
| Table name | Often `{rawname}` or `{rawname}_{entity}` |
| KVStore table | `kvstore_FreePBX_modules_{Classname}` |
| KVStore ID | String identifier per config group; `'noid'` for default |

---

## Console Commands

| Item | Convention |
|------|---------|
| Command name | Lowercase, matches `module.xml` `<name>` |
| Class file | `Console/{Classname}.class.php` |
| Class | `FreePBX\Console\Command\{Classname}` |

---

## Module XML Variants

Both casings accepted in the wild:

| Element | Variants |
|---------|----------|
| Publisher | `<publisher>`, `<Publisher>` |
| License | `<license>`, `<licence>` |

rawname itself is always lowercase in `<rawname>`.

---

## Constraints

- Class filename must be `{Classname}.class.php` — autoload depends on exact match
- Do not use paths in autoload requests — `Self_Helper` rejects `/` and `..`
- `FreePBX::FreePBX` is forbidden (exception thrown)
- Hook module names in cache use `ucfirst(strtolower($module))`
- GUI display keys in `<menuitems>` become `?display={key}` URLs
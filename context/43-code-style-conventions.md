# Code Style Conventions

## Scope

PHP formatting norms observed in FreePBX framework and module source. Sources: BMO class headers, `helloworld/Helloworld.class.php`, `freepbx-gists/moduleclass.stub.php`.

---

## Vim Modeline (Framework Standard)

Most framework BMO files open with:

```php
<?php
// vim: set ai ts=4 sw=4 ft=php:
```

| Flag | Meaning |
|------|---------|
| `ai` | Auto-indent |
| `ts=4` | Tab width displays as 4 spaces |
| `sw=4` | Shift width 4 for indent operations |
| `ft=php` | PHP filetype |

This is the documented Sangoma/FreePBX convention for PHP indentation settings.

---

## Indentation

Observed in `helloworld` and framework BMO files: **tab characters** for indentation, not spaces.

```php
	public function install()
	{
		$fcc = new \featurecode('helloworld', 'helloworld');
	}
```

Match surrounding file style when editing existing modules. New BMO files should follow the vim modeline + tab indent pattern used in framework.

---

## PHP Open Tag

```php
<?php
// No closing ?> at end of pure PHP files
```

helloworld README explicitly warns:

> Avoid using `?>` followed by an empty newline, as PHP may encounter issues. Only use `?>` for inline PHP.

---

## Class Structure

```php
<?php

namespace FreePBX\modules;

use BMO;
use FreePBX_Helpers;

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

| Convention | Detail |
|------------|--------|
| `implements BMO` | Required for module class |
| `extends FreePBX_Helpers` | Modern pattern (helloworld) |
| `$this->FreePBX` | Store BMO reference |
| Braces | K&R style — opening brace on same line for methods |

---

## Naming in Code

| Item | Style |
|------|-------|
| Methods | `camelCase` — `doConfigPageInit`, `getActionBar` |
| Class | `PascalCase` — `Helloworld` |
| Variables | `$camelCase` or `$snake_case` — mixed in legacy code |
| Constants | `UPPER_SNAKE` — `MODULE_STATUS_ENABLED` |
| Private/protected | No strict prefix; framework uses `private $` |

---

## Translation Wrapping

User-visible strings must be wrapped:

```php
_('Hello World')                           // GUI with active textdomain
modgettext::_('Hello World', 'helloworld') // Explicit module domain
```

See `36-i18n-localization.md`.

---

## Comments

Framework uses PHPDoc blocks on public methods:

```php
/**
 * Installer run on fwconsole ma install
 *
 * @return void
 */
public function install() { }
```

Avoid verbose comments on obvious code. Match documentation level of surrounding file.

---

## Legacy vs BMO Style

| Aspect | Legacy (`functions.inc.php`) | BMO |
|--------|------------------------------|-----|
| Structure | Procedural functions | Class methods |
| Indent | Mixed | Tabs + vim modeline |
| Prefix | `{mod}_function()` | Method names without prefix |

---

## Constraints

- Do not reformat unrelated code in drive-by changes
- Preserve vim modeline in new framework-style PHP files
- Use tabs for indent in module PHP matching helloworld/framework
- No closing `?>` on class files
- Wrap all user-facing strings with `_()` or `modgettext::_()`
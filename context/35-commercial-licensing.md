# Commercial Module Licensing (IONCube / Schmooze\Zend)

## Scope

IONCube-encoded commercial modules require valid Sangoma license. Framework gates loading of licensed files to prevent system crashes when license is missing. Source: `BMO/Modules.class.php::loadLicensedFileCheck()`, `bootstrap.php`, `Self_Helper.class.php`.

**Note:** `\Schmooze\Zend` class lives in **sysadmin** module — not in framework clone.

---

## License Gate — `loadLicensedFileCheck()`

```php
public function loadLicensedFileCheck() {
	// Cached in $this->validLicense
	$licFileExists = glob('/etc/schmooze/license-*.zl');
	if (!function_exists('zend_loader_install_license') || empty($licFileExists)) {
		return false;
	}
	// Load Schmooze.class.php from sysadmin module
	$sclass = AMPWEBROOT . "/admin/modules/sysadmin/functions.inc/Schmooze.class.php";
	include $sclass;
	if (!\Schmooze\Zend::hasValidLic()) {
		return false;
	}
	return true;
}
```

Requirements:
1. IONCube runtime (`zend_loader_install_license` function exists)
2. License file at `/etc/schmooze/license-*.zl`
3. `sysadmin` module's `Schmooze.class.php` loadable
4. `\Schmooze\Zend::hasValidLic()` returns true

---

## Licensed File Detection

```php
\Schmooze\Zend::fileIsLicensed($file)  // true if IONCube-encoded
```

Used to skip loading encoded files when license invalid.

---

## Gate Call Sites (verified)

| Location | Behavior when license invalid |
|----------|-------------------------------|
| `bootstrap.php` | Skip licensed BMO class files during bootstrap |
| `config.php` | Show `VIEW_ZEND_CONFIG` Zend configuration page |
| `Modules::loadAllFunctionsInc()` | Skip licensed `functions.inc.php` |
| `Modules::loadFunctionsInc()` | Skip licensed module functions |
| `Self_Helper::loadObject()` | Block BMO class include |

---

## Zend Module Detection

Modules depending on Zend/IONCube identified via:

```php
stristr($module['depends']['phpcomponent'], 'zend')
```

---

## Invalid License UX

When accessing a page whose PHP file is licensed but license is invalid:

```php
// config.php shows VIEW_ZEND_CONFIG
die_freepbx(_("Your Zend Configuration is not fully setup..."));
```

---

## Relationship to Module Signing

Module signing (GPG) and commercial licensing (IONCube) are separate systems:

| System | Purpose | Doc |
|--------|---------|-----|
| GPG signatures | Tamper detection for all modules | `28-module-signing.md` |
| IONCube/Zend | Runtime license for commercial modules | This file |

A commercial module may be both GPG-signed and IONCube-encoded.

---

## Constraints

- `\Schmooze\Zend` not in framework — requires `sysadmin` module
- Missing license does not crash system — files are skipped
- `loadLicensedFileCheck()` result is cached per request
- License files must be in `/etc/schmooze/license-*.zl`
- IONCube loader must be installed at PHP level
- Do not bypass `loadLicensedFileCheck()` gates in custom code
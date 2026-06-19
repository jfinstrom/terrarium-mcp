# Module Signing and Integrity Validation

## Scope

GPG-based verification of module file integrity. Controlled by `SIGNATURECHECK` advanced setting. Source: `BMO/GPG.class.php`, `modulefunctions.class.php::getSignature()`, `config.php`, `Console/Reload.class.php`.

---

## Overview

FreePBX modules distributed by Sangoma are GPG-signed. Framework verifies signatures on install, GUI module access, and reload to detect tampered or unsigned code.

---

## Configuration

| Setting | Default | Effect |
|---------|---------|--------|
| `SIGNATURECHECK` | `true` (set during install) | Enable/disable signature validation |

When disabled, reload adds `SIGNATURE_CHECK` notice notification.

```php
if (!$this->freepbx->Config->get('SIGNATURECHECK')) {
	$this->freepbx->Notifications->add_notice('freepbx', 'SIGNATURE_CHECK', ...);
}
```

---

## GPG State Constants (`GPG.class.php`)

| Constant | Value | Meaning |
|----------|-------|---------|
| `STATE_GOOD` | 1 | Signature valid |
| `STATE_TAMPERED` | 2 | File hash mismatch |
| `STATE_UNSIGNED` | 4 | No signature |
| `STATE_INVALID` | 8 | Signed by invalid key |
| `STATE_TRUSTED` | 16 | Key is trusted |
| `STATE_REVOKED` | 32 | Key revoked |

Status is a bitmask — check with `&` operator.

---

## Key Operations

### `GPG::trustFreePBX()`

Called during every reload. Ensures FreePBX signing keys are in GPG owner-trust. Also checks GPG directory permissions.

### `GPG::verifyModule($modulename)`

Called during `module_functions::install()`. Returns status array. Revoked signatures block installation:

```php
$mod = $FreePBX->GPG->verifyModule($modulename);
if ($mod['status'] & FreePBX\GPG::STATE_REVOKED) {
	return array(_("Module has a revoked signature and cannot be installed"));
}
```

### `module_functions::getSignature($modulename)`

Reads cached signature from `modules.signature` JSON column. Refreshes via `updateSignature()` if missing or `$cached=false`.

### `module_functions::getAllSignatures($cached, $online)`

Validates all installed modules. Generates notifications:

| Status | Notification Level |
|--------|-------------------|
| `tampered` | Security (critical) |
| `unsigned` | Signature unsigned (warning) |
| `revoked` | Auto-disables module |
| `untrusted` | Warning |

Unsigned `framework` or `core` flagged as critical tampered.

---

## When Checks Run

| Trigger | Action |
|---------|--------|
| `fwconsole ma install` | `verifyModule()` before install |
| GUI module page load | `updateSignature()` for viewed module + `getAllSignatures()` |
| `fwconsole reload` | `trustFreePBX()` + async/full `getAllSignatures()` |
| `Self_Helper` module load | `getSignature()` check (cached) |

Reload signature check:

```php
if ($external) {
	exec($AMPBIN."/fwconsole util signaturecheck > /dev/null 2>&1 &");
} else {
	module_functions::create()->getAllSignatures(false);
}
```

---

## Tampered File Detection

When `STATE_TAMPERED` is set, `details` array lists modified file paths. Special case for `fwconsole` binary:

> If you just updated FreePBX, run `fwconsole chown` then `fwconsole reload`

---

## GUI Blocking

`config.php` checks signatures when viewing a module (unless `quietmode` or `fw_popover`):

```php
if ($amp_conf['SIGNATURECHECK'] && !isset($_REQUEST['quietmode'])) {
	$gpgstatus = module_functions::create()->updateSignature($module_name, false);
	$modules = module_functions::create()->getAllSignatures();
	if (!$modules['validation']) { /* show warnings */ }
}
```

---

## Developer Implications

| Scenario | Behavior |
|----------|------------|
| Unsigned local dev module | Warning notification, still functional |
| Modified signed module file | Tampered notification, security alert |
| Revoked signature | Module auto-disabled |
| `SIGNATURECHECK=false` | All checks skipped, notice shown |

---

## Constraints

- GPG keyring location managed by `GPG::getGpgLocation()` — permissions set by `fwconsole chown`
- Signature data cached in `modules` table `signature` column as JSON
- Cannot install modules with revoked signatures
- Re-download from official repos to fix tampered/unsigned official modules
- Local/unsupported modules (`repo=unsupported`) expected to be unsigned
# UCP (User Control Panel) Integration

## Scope

User-facing web panel for end users (distinct from admin GUI). UCP is a **separate module** (`ucp`); framework provides autoloading, login link, and startup guards. Module-level UCP widgets live under each module's directory. Source: `functions.inc.php` PSR-4 autoload, `views/login.php`, `Console/Start.class.php`, `helloworld/README.md`.

**Note:** `ucp` module not cloned in workspace — runtime lives in `admin/modules/ucp/`.

---

## Architecture

```
Admin GUI (config.php)     →  Administrators
UCP (/ucp)                 →  End users (Node.js + PHP, separate module)
Module UCP widgets         →  {module}/ucp/ or namespace FreePBX\modules\{Mod}\...
```

UCP is optional per module. helloworld documents it as non-primary and does not implement it.

---

## Directory Convention (helloworld README)

```
{rawname}/
  ucp/                    # Optional UCP integration
    assets/
      js/
      css/
    views/
    ucp/
      Modulename.class.php   # UCP handler class (convention)
```

Same asset/view separation as admin GUI — views are HTML without logic.

---

## PSR-4 Autoloading (framework)

Framework autoloader resolves module sub-namespaces:

```php
// Request: \FreePBX\modules\Ucp\Widgets\Ponies
// Resolves: {AMPWEBROOT}/admin/modules/ucp/Widgets/Ponies.php

$moddir = AMPWEBROOT . "/admin/modules/" . strtolower($modname) . "/";
$filepath = $moddir . join("/", $remaining) . ".php";
```

From `functions.inc.php` — any `FreePBX\modules\{Module}\{SubPath}` maps to `{module}/{SubPath}.php` with lowercase module directory name.

---

## Framework Integration Points

### Login page link

Shown only when `ucp` module is enabled:

```php
if (\FreePBX::Modules()->checkStatus('ucp')) {
	// Link to /ucp with user-control.png icon
}
```

### Node.js requirement

`fwconsole start ucp` checks advanced setting:

```php
if (strtolower($v) == "ucp" && !\FreePBX::Config()->get("NODEJSENABLED")) {
	// Error: UCP Node Disabled in Advanced Settings
}
```

UCP requires `NODEJSENABLED = true` in Advanced Settings.

### Module generator scaffold

`03-module-lifecycle.md` notes generator may include optional `ucp/` directory — treat as optional scaffold.

---

## Module Development Pattern

1. Create `ucp/` subdirectory in module (if end-user features needed)
2. Implement UCP class following `ucp` module conventions (see `admin/modules/ucp/` on installed system)
3. Register widgets/assets per UCP module documentation
4. Use `FreePBX\modules\{Modulename}\...` namespace for PSR-4 autoload

**helloworld does not implement UCP** — only documents folder structure.

---

## Constraints

- UCP is not part of BMO `Modulename.class.php` — separate UCP class file
- Requires `ucp` framework module enabled
- Requires Node.js (`NODEJSENABLED`)
- PSR-4 path uses lowercase module directory name
- No UCP reference implementation in helloworld clone — consult live `ucp` module source
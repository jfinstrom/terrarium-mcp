# FastAGI Handling Patterns

## Scope

FastAGI routes AGI scripts through a local socket server instead of spawning a new process per call. Framework handles dialplan rewrite in `ext_agi`; server lifecycle lives in **core** module (not cloned). Source: `extensions.class.php`, `phpagi.php`.

---

## Dialplan Rewrite (`ext_agi`)

When generating dialplan, `ext_agi::output()` checks FastAGI status:

```php
class ext_agi extends extension {
	private static $prependFastAGI = null;

	function output() {
		if (is_null(static::$prependFastAGI)) {
			static::$prependFastAGI =
				\FreePBX::Modules()->moduleHasMethod("core", "fastAGIStatus")
				&& \FreePBX::Core()->fastAGIStatus();
		}
		$data = static::$prependFastAGI && !preg_match('/^agi:\/\//', $this->data)
			? "agi://127.0.0.1/" . $this->data
			: $this->data;
		return "AGI(" . $data . ")";
	}
}
```

| Condition | Output |
|-----------|--------|
| FastAGI enabled + plain path | `AGI(agi://127.0.0.1/{path})` |
| Already `agi://` URL | `AGI({data})` unchanged |
| FastAGI disabled | `AGI({data})` standard fork |

---

## FastAGI Status Check

```php
\FreePBX::Modules()->moduleHasMethod("core", "fastAGIStatus")
\FreePBX::Core()->fastAGIStatus()  // returns bool — core module method
```

**`fastAGIStatus()` implementation is in `core` module** — not present in framework clone. Do not document server startup details without core source.

---

## AGI Script Bootstrap (standard AGI)

AGI scripts in `{ASTAGIDIR}` bootstrap FreePBX externally:

```php
#!/usr/bin/php -q
<?php
$bootstrap_settings['freepbx_auth'] = false;
include_once '/etc/freepbx.conf';
// Use $astman, FreePBX::create(), etc.
```

See `05-external-bootstrap.md`.

`phpagi.php` in `amp_conf/agi-bin/` provides AGI class with `$socket` property for FastAGI socket communication.

---

## FastAGI Server Management

Referenced in framework i18n strings and `Console/Job.class.php` messages as "Core FastAGI Server" — PM2/process management is in **core** module.

`fwconsole start` can start services including UCP (Node.js); FastAGI server start/stop is core-managed.

---

## Module AGI Files

Modules place AGI scripts in:

```
{module}/agi-bin/{script}
```

Symlinked/copied to `{ASTAGIDIR}` during `fwconsole reload` (see `24-reload-apply-config.md`).

When FastAGI is active, dialplan references become `agi://127.0.0.1/{module-script-path}`.

---

## Constraints

- Framework only rewrites dialplan — does not implement FastAGI server
- `Core::fastAGIStatus()` must exist and return true for rewrite to activate
- AGI paths already using `agi://` scheme are not double-prefixed
- AGI scripts need external bootstrap (`freepbx.conf`)
- FastAGI server lifecycle documented in core module, not framework
# Cron Job Registration

## Scope

Managing crontab entries for the Asterisk web user. Modern API: `FreePBX\Cron` BMO class. Legacy `cronmanager` DB table exists but its PHP handler class is not present in current framework source. Source: `BMO/Cron.class.php`, `Reload.class.php::installCrons()`, `Builtin/UpdateManager.php`.

---

## BMO Cron Class

Access via `FreePBX::Cron()` or `$freepbx->Cron`.

Default user: `AMPASTERISKWEBUSER` (typically `asterisk`).

```php
$cron = \FreePBX::Cron();

// Direct crontab line
$cron->add("@hourly /path/to/script.sh");
$cron->add("* * * * * /path/to/script.sh");

// Structured array
$cron->add([
	"command" => "/usr/sbin/fwconsole job --run --quiet",
	"hour" => "3",
	"minute" => "15",
]);

// Magic shortcuts (@hourly, @daily, @monthly, etc.)
$cron->add(["command" => "/bin/true", "magic" => "@daily"]);

// Remove
$cron->remove("* * * * * /path/to/script.sh");
$cron->removeAll("/path/to/script.sh");
```

---

## Constructor Variants

```php
new Cron($freepbx, 'asterisk');  // manage asterisk user's crontab
new Cron('asterisk');            // shorthand
new Cron();                      // defaults to AMPASTERISKWEBUSER
```

Non-root users can only edit their own crontab. Root uses `crontab -u {user}`.

---

## Concurrency Safety

`Cron` uses Symfony `SemaphoreStore` lock (`crontab-{user}`, 60s timeout) around add/remove operations to prevent race conditions.

Errors logged to `{ASTSPOOLDIR}/tmp/cron.error`.

---

## Framework-Managed Crons (during reload)

`Reload::installCrons()` runs every `fwconsole reload`:

1. Removes stale `fwconsole util cleanplaybackcache` lines
2. Adds randomized-hour `fwconsole util cleanplaybackcache -q`
3. Calls `UpdateManager::updateCrontab()` for module update scheduling

`UpdateManager::updateCrontab()` reads update settings, picks random hour/minute, and manages `fwconsole ma` online update cron lines.

---

## Module Cron Patterns

### Direct BMO Cron usage (recommended)

In `install()` or a dedicated setup method:

```php
public function install()
{
	\FreePBX::Cron()->add([
		"command" => \FreePBX::Config()->get('AMPSBIN')."/fwconsole mymodule --task",
		"hour" => "2",
	]);
}
```

In `uninstall()`:

```php
public function uninstall()
{
	\FreePBX::Cron()->removeAll(\FreePBX::Config()->get('AMPSBIN')."/fwconsole mymodule --task");
}
```

### Via `fwconsole` command in cron

Prefer `fwconsole {command}` over raw PHP scripts — bootstrap and autoload are handled.

---

## Legacy: `cronmanager` Table

Defined in `framework/module.xml`:

| Column | Purpose |
|--------|---------|
| `module` | Module rawname (PK) |
| `id` | Cron job ID (PK) |
| `time` | Time spec |
| `freq` | Frequency integer |
| `lasttime` | Last run timestamp |
| `command` | Shell command |

`cronmanager.class.php` referenced in upgrade MD5 manifests but **not present** in current framework clone. New modules should use `FreePBX\Cron` directly, not `cronmanager` inserts.

---

## External Script Cron

External scripts should bootstrap FreePBX:

```php
$bootstrap_settings['freepbx_auth'] = false;
include_once '/etc/freepbx.conf';
```

Then use BMO services. Crontab entry example:

```
0 2 * * * /usr/bin/php /path/to/myscript.php
```

---

## Constraints

- Cannot programmatically add `* * * * *` via structured array (throws exception — use direct line string)
- `remove()` only removes first matching duplicate line
- `add()` is idempotent — existing identical lines are not duplicated
- Cron changes require appropriate user permissions (root for other users' crontabs)
- Test cron syntax failures in `{ASTSPOOLDIR}/tmp/cron.error`
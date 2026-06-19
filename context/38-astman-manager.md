# Astman Manager Integration

## Scope

Asterisk Manager Interface (AMI) access via `AGI_AsteriskManager` class. Connected at bootstrap as global `$astman` and BMO property. Source: `php-asmanager.php`, `bootstrap.php`, `utests/AstmanTest.php`, `BMO/PKCS.class.php`, `BMO/Realtime.class.php`.

---

## Bootstrap Connection

```php
// bootstrap.php
$astman = new AGI_AsteriskManager($bootstrap_settings['astman_config'], $bootstrap_settings['astman_events']);
$astman->connect(...);
FreePBX::create()->astman = $astman;
```

Skip with `$bootstrap_settings['skip_astman'] = true`.

Config from `$amp_conf`: `ASTMANAGERHOST`, `AMPMGRUSER`, `AMPMGRPASS`.

---

## Access Patterns

```php
global $astman;                    // Legacy
$astman = \FreePBX::create()->astman;  // BMO
\FreePBX::Astman()                 // Self_Helper (if available)
```

---

## Key `AGI_AsteriskManager` Methods

Verified from source and `AstmanTest.php`:

| Method | Purpose |
|--------|---------|
| `connect()` | Establish AMI connection |
| `connected()` | Check connection status |
| `Reload()` | Asterisk reload (used in `fwconsole reload`) |
| `app_exists($app)` | Check Asterisk application exists |
| `database_show($family)` | Read AstDB family |
| `database_put($family, $key, $val)` | Write AstDB entry |
| `database_get($family, $key)` | Read AstDB entry |
| `database_del($family, $key)` | Delete AstDB entry |
| `database_deltree($family)` | Delete AstDB family |
| `LoadAstDB()` | Preload AstDB into cache |
| `getDBCache()` | Get cached AstDB data |
| `command($cmd)` | Raw manager command |

**Property:** `$useCaching` — enable/disable AstDB caching.

---

## AstDB Helper

```php
astdb_get($exclude = array())  // utility.functions.php — read AstDB with optional family exclusion
```

Used in dialplan and module logic for persistent key-value storage in Asterisk.

Reload preloads AstDB: `$astman->useCaching = true; $astman->LoadAstDB()` in `Reload.class.php`.

---

## Caching Pattern

```php
$astman->useCaching = false;
$uncached = $astman->database_show();

$astman->useCaching = true;
$cached = $astman->database_show();
// Should match when caching works correctly
```

Verified in `AstmanTest::testCaching()`.

---

## PKCS (SSL Certificate Management)

**Class:** `FreePBX\PKCS` (`BMO/PKCS.class.php`)

| Method | Purpose |
|--------|---------|
| `setKeysLocation($loc)` | Set cert storage path |
| `createConfig($base, $cn, $o, $force)` | Create OpenSSL config |
| `generateKey($name, $password, $bits)` | Generate private key |
| `createCA($base, $passphrase, $force)` | Create CA cert |
| `createCSR($name, $params, $regen)` | Certificate signing request |
| `selfSignCert($name, $caname, $password, $serial)` | Self-sign certificate |

Access: `FreePBX::PKCS()`. Tested in `utests/PKCSTest.php`.

---

## Realtime (AstDB/Extconfig)

**Class:** `FreePBX\Realtime` (`BMO/Realtime.class.php`)

| Method | Purpose |
|--------|---------|
| `enableQueueLog()` | Add queue_log to extconfig.conf |
| `disableQueueLog()` | Remove queue_log from extconfig |
| `write()` | Write extconfig entries |

Tested in `utests/RealtimeTest.php` against `extconfig.conf` queue_log entries.

---

## Reload Integration

`fwconsole reload` requires working AMI:

```php
if (!$this->freepbx->astman->connected()) {
	throw new \Exception(_("Unable to connect to Asterisk Manager"));
}
// ...
$this->freepbx->astman->Reload();
```

---

## Constraints

- AMI connection required for reload and real-time operations
- Default manager password triggers security notification (see `24-reload-apply-config.md`)
- `$useCaching` affects AstDB read performance — enabled during reload
- `skip_astman` bootstrap setting disables connection for scripts not needing AMI
- PKCS operations require OpenSSL on system
- Astman is global singleton — do not create duplicate connections
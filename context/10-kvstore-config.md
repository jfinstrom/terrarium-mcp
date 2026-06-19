# KVStore Configuration Storage

## Scope

Per-module key-value persistence via `DB_Helper` methods inherited through `FreePBX_Helpers`. Backed by auto-created MySQL tables.

---

## Table Naming

```
kvstore_{sanitized_class_name}
```

| Class | Table |
|-------|-------|
| `FreePBX\modules\Helloworld` | `kvstore_FreePBX_modules_Helloworld` |
| `FreePBX\Hooks` | `kvstore_FreePBX_Hooks` |

Backslashes in class name become underscores. Tables auto-created on first access.

---

## Schema

```sql
CREATE TABLE IF NOT EXISTS `kvstore_{name}` (
	`key` CHAR(255) NOT NULL,
	`val` VARCHAR(4096),
	`type` CHAR(16) DEFAULT NULL,
	`id` CHAR(255) DEFAULT NULL,
	UNIQUE INDEX `uniqueindex` (`key`(190), `id`(190)),
	INDEX `keyindex` (`key`(190)),
	INDEX `idindex` (`id`(190))
);
```

| Column | Purpose |
|--------|---------|
| `key` | Configuration key |
| `val` | Serialized value (max 4096 chars) |
| `type` | PHP type hint for deserialization |
| `id` | Subgroup identifier (default `noid`) |

---

## Core API

### Read

```php
$value = $this->getConfig('timezone', 'server_settings');
$all = $this->getAll('server_settings');
$keys = $this->getAllKeys('server_settings');
$ids = $this->getAllids();
```

| Method | Signature | Returns |
|--------|-----------|---------|
| `getConfig` | `($key, $id = 'noid', $cache = true)` | Stored value or `false` |
| `getAll` | `($id = 'noid')` | Associative array of all keys in subgroup |
| `getAllKeys` | `($id = 'noid')` | Array of key names |
| `getAllids` | `()` | Distinct subgroup IDs |
| `getFirst` | `($id = 'noid')` | First key in subgroup |
| `getLast` | `($id = 'noid')` | Last key in subgroup |

### Write

```php
$this->setConfig('max_users', 100, 'license_settings');
$this->setMultiConfig([
	'welcome_message' => 'Hello World',
	'max_attempts' => 5,
], 'auth_settings');
```

| Method | Signature | Notes |
|--------|-----------|-------|
| `setConfig` | `($key, $val, $id = 'noid')` | Pass `false` as `$val` to delete |
| `setMultiConfig` | `($keyval, $id = 'noid')` | Transactional batch write |

### Delete

```php
$this->delConfig('legacy_feature', 'experimental');
$this->delById('temp_cache');
$this->deleteAll(); // drops entire kvstore table
```

| Method | Signature | Scope |
|--------|-----------|-------|
| `delConfig` | `($key, $id = 'noid')` | Single key |
| `delById` | `($id)` | All keys in subgroup |
| `deleteAll` | `()` | Entire table (use in `uninstall()`) |

---

## Subgroup (`$id`) Organization

```php
// Root-level config
$this->setConfig('enabled', true);

// Grouped config
$this->setConfig('host', '10.0.0.1', 'sip_settings');
$this->setConfig('port', 5060, 'sip_settings');

// Retrieve
$host = $this->getConfig('host', 'sip_settings');
```

- Default `$id` = `'noid'` for ungrouped settings
- `getConfig('host')` with no `$id` will NOT find `getConfig('host', 'sip_settings')`

---

## Type Serialization

Complex types auto-serialized:

```php
$this->setConfig('preferences', [
	'dark_mode' => true,
	'notifications' => false,
]);
// Stored with type metadata; returned as array on getConfig()
```

Supported round-trip types: string, int, float, bool, array, object (as `stdClass`).

---

## Caching

In-memory cache per table (`DB_Helper::$cache`):

```php
// Bypass cache, force DB read
$this->getConfig('system_version', 'noid', false);
```

Cache cleared on `setConfig`/`delConfig` for affected keys.

---

## `classOverride`

For testing or aliasing storage:

```php
$this->classOverride = 'CustomTableName';
$this->setConfig('key', 'value');
// Stores in kvstore_CustomTableName
```

---

## Framework Usage Examples

### Hooks Cache

```php
// Hooks.class.php stores entire hook registry
$this->setConfig('hooks', $allhooks);
$hooks = $this->getConfig('hooks');
```

### Request Import

```php
// Request_Helper::importRequest stores form data to kvstore
$this->importRequest(['display', 'type'], null, 'form_data');
```

---

## Uninstall Cleanup

```php
public function uninstall()
{
	$this->deleteAll();
}
```

Drops `kvstore_{class}` table and all data.

---

## Constraints

- `val` column limited to 4096 characters; large data belongs in module tables
- `getConfig(null)` throws Exception
- Never `new DB_Helper()` — methods only available via `extends FreePBX_Helpers`
- Key length max 190 chars (UTF-8 index limit, FREEPBX-14956)
- Not suitable for relational queries — use PDO module tables for structured data
- Thread-safe within single PHP request only; no cross-process cache invalidation
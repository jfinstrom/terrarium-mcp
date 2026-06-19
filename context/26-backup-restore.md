# Backup and Restore Module Integration

## Scope

Per-module backup/restore via `Backup.php` and `Restore.php` classes extending base classes from the `backup` module. Reference: `helloworld/Backup.php`, `helloworld/Restore.php`, `backup/BackupBase.php`, `backup/RestoreBase.php`.

**Dependency:** Requires the `backup` module installed and enabled.

---

## File Convention

| File | Class | Namespace |
|------|-------|-----------|
| `Backup.php` | `Backup` | `FreePBX\modules\{Modulename}` |
| `Restore.php` | `Restore` | `FreePBX\modules\{Modulename}` |

Path: `{AMPWEBROOT}/admin/modules/{rawname}/Backup.php`

---

## Backup Class

```php
<?php
namespace FreePBX\modules\Helloworld;
use FreePBX\modules\Backup as Base;

class Backup extends Base\BackupBase
{
	public function runBackup($id, $transaction)
	{
		$kvstoreids = $this->FreePBX->Helloworld->getAllids();
		$kvstoreids[] = 'noid';
		$settings = [];
		foreach ($kvstoreids as $value) {
			$settings[$value] = $this->FreePBX->Helloworld->getAll($value);
		}
		$this->addConfigs($settings);
	}
}
```

### Required Method

| Method | When Called |
|--------|-------------|
| `runBackup($id, $transaction)` | During backup job for this module |

If not implemented and `defaultFallback` is enabled, `BackupBase` calls `dumpAll()` automatically.

### Key `BackupBase` Helpers

| Method | Exports |
|--------|---------|
| `addConfigs($array)` | Add module data to backup archive |
| `dumpAll()` | Settings + feature codes + tables + kvstore |
| `dumpAdvancedSettings()` | `freepbx_settings` for module |
| `dumpFeatureCodes()` | `featurecodes` rows for module |
| `dumpTables()` | Module DB tables from `module.xml` |
| `dumpKVStore()` | KVStore entries |
| `dumpDBTables($name)` | Tables matching name pattern |
| `dumpAstDB($family)` | Asterisk DB family |

Template: `backup/examples/Backup.php.template`

```php
public function runBackup($id, $transaction) {
	$configs = $this->dumpAll();
	$this->addConfigs($configs);
}
```

---

## Restore Class

```php
<?php
namespace FreePBX\modules\Helloworld;
use FreePBX\modules\Backup as Base;

class Restore extends Base\RestoreBase
{
	public function runRestore($jobid)
	{
		$settings = $this->getConfigs();
		foreach ($settings as $key => $value) {
			$this->freepbx->Helloworld->setMultiConfig($value, $key);
		}
	}

	public function processLegacy($pdo, $data, $tables, $unknownTables, $tmpfiledir)
	{
		return $this->transformLegacyKV($pdo, 'helloworld', $this->freepbx)
			->transformNamespacedKV($pdo, 'helloworld', $this->freepbx);
	}
}
```

### Required Methods

| Method | When Called |
|--------|-------------|
| `runRestore($jobid)` | Modern backup format restore |
| `processLegacy($pdo, $data, $tables, $unknownTables, $tmpfiledir)` | Legacy `.tgz` backup migration |

If `runRestore()` not implemented and backup used `defaultFallback`, `RestoreBase` calls `importAll()`.

### Key `RestoreBase` Helpers

| Method | Purpose |
|--------|---------|
| `getConfigs()` | Read this module's backup data |
| `importAll($data)` | Import settings, codes, tables, kvstore, astdb |
| `importAdvancedSettings($settings)` | Restore `freepbx_settings` |
| `importFeatureCodes($codes)` | Restore `featurecodes` |
| `importTables($tables)` | Restore DB tables |
| `importKVStore($kvstore)` | Restore KVStore |
| `transformLegacyKV()` | Chain helper for legacy kvstore migration |
| `transformNamespacedKV()` | Chain helper for namespaced kvstore |

Template: `backup/examples/Restore.php.template`

---

## Backup Module Orchestration

The `backup` module discovers `Backup.php`/`Restore.php` in each enabled module's directory. Module backup jobs invoke `runBackup()` per selected module; restore jobs invoke `runRestore()` or `processLegacy()` as appropriate.

GUI: Admin → Backup & Restore (requires `backup` module).

---

## What to Back Up

| Data Type | Method |
|-----------|--------|
| KVStore config | Custom `addConfigs()` or `dumpKVStore()` |
| Custom DB tables | `dumpTables()` or `dumpDBTables()` |
| Advanced settings | `dumpAdvancedSettings()` |
| Feature codes | `dumpFeatureCodes()` |
| Asterisk DB | `dumpAstDB($family)` |
| Files | Use backup module file manifest (outside this doc's scope) |

---

## Constraints

- Classes extend `FreePBX\modules\Backup\BackupBase` / `RestoreBase`, not BMO interface
- `backup` module must be installed — base classes live there
- `runBackup` receives `$id` (backup job ID) and `$transaction` object
- Legacy restore requires `processLegacy()` for pre-backup-module `.tgz` files
- Use `$this->FreePBX` (Backup) or `$this->freepbx` (Restore) — casing differs between helloworld example and base class
- Do not implement backup methods on the main BMO class — separate `Backup.php`/`Restore.php` files
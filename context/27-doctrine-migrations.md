# Doctrine Database Migrations (External)

## Scope

Programmatic schema management via Doctrine DBAL through `FreePBX\Database` and `Migration` classes. Used for standalone scripts and advanced table management beyond `module.xml` `<database>`. Source: `freepbx-dev-docs/Advanced Topics/doctrine-database-migrations-external.md`, `BMO/Database.class.php`, `BMO/Database/Migration.class.php`.

---

## When to Use

| Approach | Use Case |
|----------|----------|
| `module.xml` `<database>` | Standard module install/upgrade (auto via `migrateMultipleXML`) |
| Doctrine `migrate()` | Standalone scripts, complex multi-table changes, external tooling |
| `fwconsole doctrine` | Framework CLI wrapper (see framework `module.xml`) |

Inside BMO module methods, use `$this->FreePBX->Database` — no `/etc/freepbx.conf` include needed.

---

## Standalone Script Bootstrap

```php
<?php
$bootstrap_settings['freepbx_auth'] = false;
include_once '/etc/freepbx.conf';

$host = \FreePBX::Config()->get('AMPDBHOST');
$port = \FreePBX::Config()->get('AMPDBPORT') ?: 3306;
$database = \FreePBX::Config()->get('AMPDBNAME');
$user = \FreePBX::Config()->get('AMPDBUSER');
$password = \FreePBX::Config()->get('AMPDBPASS');

$dsn = sprintf('mysql:host=%s;port=%s;dbname=%s', $host, $port, $database);
$db = new \FreePBX\Database($dsn, $user, $password);
```

---

## Table Definition Format

```php
$tables = [
	'example_table' => [
		'columns' => [
			'id' => [
				'type' => 'integer',
				'autoincrement' => true,
				'unsigned' => true,
				'notnull' => true,
				'primarykey' => true,
			],
			'name' => [
				'type' => 'string',
				'length' => 100,
				'notnull' => false,
				'default' => null,
			],
		],
		'indexes' => [
			'name_idx' => [
				'type' => 'index',
				'cols' => ['name'],
			],
		],
	],
];
```

### Supported Column Types

`integer`, `string`, `bigint`, `smallint`, `boolean`, `date`, `datetime`, `float`, `decimal`, `text`, `blob`

### Column Properties

| Property | Type | Purpose |
|----------|------|---------|
| `type` | string | Data type |
| `autoincrement` | bool | Auto-increment PK |
| `unsigned` | bool | Non-negative numeric |
| `notnull` | bool | NOT NULL constraint |
| `primarykey` | bool | Primary key |
| `length` | int | String max length |
| `precision` / `scale` | int | Decimal/float precision |
| `default` | mixed | Default value |

### Index Properties

| Property | Values |
|----------|--------|
| `type` | `index`, `unique` |
| `cols` | Array of column names |

---

## Running Migrations

```php
$dryrun = false;
$migrate = $db->migrate('my_migration_id');  // non-empty string identifier
$migrate->modifyMultiple($tables, $dryrun);
```

| Parameter | Purpose |
|-----------|---------|
| `migrate('id')` | Creates migration context with version tracking |
| `$tables` | Table definition array |
| `$dryrun = true` | Preview SQL without applying |

---

## Inside BMO Modules

During `install()` or custom upgrade logic:

```php
public function install()
{
	$tables = [ /* definitions */ ];
	$migrate = $this->Database->migrate('helloworld_install');
	$migrate->modifyMultiple($tables, false);
}
```

For `module.xml` schema, prefer letting `module_functions::install()` call `Database->migrateMultipleXML()` automatically.

---

## Migration Class Internals

`FreePBX\Database\Migration`:

- Uses Doctrine DBAL `Schema`, `Comparator`, `SingleDatabaseSynchronizer`
- Registers `enum` → `string` type mapping for MySQL compatibility
- `generateUpdateArray()` exports existing table structure for diffing
- `modifyMultiple()` applies create/alter operations

---

## Best Practices

- Always test with `$dryrun = true` first
- Use secure credential sources — never hardcode passwords
- Match column types to actual data requirements
- Wrap connection/migration in try-catch for standalone scripts
- Prefer `module.xml` `<database>` for standard module tables — Doctrine migrations for exceptional cases

---

## Constraints

- DSN format: `mysql:host={host};port={port};dbname={database}`
- `/etc/freepbx.conf` required for standalone scripts only
- Migration identifier string must be non-empty
- `modifyMultiple` operates on table definitions, not raw SQL
- Enum columns mapped to string type in Doctrine platform
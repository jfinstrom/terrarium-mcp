# Chown and File Permissions

## Scope

`fwconsole chown` sets ownership and permissions on FreePBX files. Modules extend via hooks; admins customize via `freepbx_chown.conf`. Source: `Console/Chown.class.php`, `{ASTETCDIR}/freepbx_chown.conf`.

---

## CLI Usage

```bash
fwconsole chown                    # full system (requires root)
fwconsole chown -m helloworld      # single module
fwconsole chown -f /path/to/file   # single file/dir
```

Non-root users can only chown files under their module path when using `-m {rawname}`.

---

## Permission Types

| Type | Behavior |
|------|----------|
| `file` | Set perms/ownership on single file |
| `dir` | Set on single directory |
| `rdir` | Recursive; strips execute bit from child files (755 dir → 644 files) |
| `execdir` | Recursive; preserves execute bit on children |

Each entry is an array:

```php
['type' => 'rdir', 'path' => '/var/www/html/admin/modules/mymod', 'perms' => 0755]
```

Optional keys: `owner`, `group`, `always` (force even if blacklist would skip).

---

## Framework Default Paths

When run without `-m`, framework sets permissions on:

- Asterisk web user home + `.ssh`
- PHP session directory
- `/etc/amportal.conf`, `/etc/freepbx.conf`
- `$ASTRUNDIR`, `$ASTETCDIR`, GPG directory
- `$AMPBIN`, `$ASTAGIDIR`, `$ASTVARLIBDIR/bin`
- Framework hooks directory
- Log files, SSH keys

Per-module (with `-m`):

- Module directory (`rdir`, 0755)
- `bin/`, `hooks/`, `agi-bin/` subdirs (`execdir`, 0755)
- Module hook contributions (see below)

---

## Module Hook Extension

`Chown::fwcChownFiles()` collects per-module file lists:

```php
private function fwcChownFiles() {
	$modules = \FreePBX::Hooks()->processHooks();
	return $modules;
}
```

`processHooks()` uses backtrace level 2 — hooks must register against `FreePBX\Console\Command\Chown::fwcChownFiles` as the calling method.

### Hook Handler Return Format

Return array keyed by module CamelCase name:

```php
public function fwcChownFiles()
{
	return [
		'Mymodule' => [
			['type' => 'file', 'path' => '/etc/asterisk/mymod.conf', 'perms' => 0664],
			['type' => 'rdir', 'path' => '/var/spool/asterisk/mymod', 'perms' => 0755],
		],
	];
}
```

Register via `module.xml`:

```xml
<hooks>
	<mymodule namespace="FreePBX\Console\Command" class="Chown">
		<method callingMethod="fwcChownFiles" priority="500">fwcChownFiles</method>
	</mymodule>
</hooks>
```

**Note:** No working hook examples found in cloned repos — pattern derived from `Chown.class.php` backtrace dispatch. Verify `callingMethod` matches backtrace target when implementing.

---

## `freepbx_chown.conf`

Location: `{ASTETCDIR}/freepbx_chown.conf`

Loaded by `Chown::loadChownConf()` via `FreePBX::LoadConfig()->getConfig()`.

### Blacklist Section

Skip specific files/directories from chown processing:

```xml
<blacklist>
	<item>/path/to/skip/file</item>
	<directory>/path/to/skip/dir</directory>
</blacklist>
```

### Custom Section

Override or add permission entries:

```xml
<custom>
	<file>/path,0664,asterisk,asterisk</file>
	<dir>/path/to/dir,0755,asterisk,asterisk</dir>
	<rdir>/path/to/recursive,0755,asterisk,asterisk</rdir>
	<execdir>/path/to/bin,0755,asterisk,asterisk</execdir>
</custom>
```

Format per line: `path,octal_perms,owner,group` (4 comma-separated fields).

Malformed lines are silently skipped (`parse_conf_line` returns false).

Wiki reference shown in CLI output: Sangoma KB "FreePBX Chown Conf".

---

## Ownership Target

Default owner/group from `AMPASTERISKWEBUSER` / `AMPASTERISKWEBGROUP` via `freepbx_conf` settings loaded at chown start.

---

## When to Run

| Situation | Command |
|-----------|---------|
| After module install/upgrade | `fwconsole chown -m {rawname}` |
| After framework update | `fwconsole chown` (full) |
| Tampered `fwconsole` signature warning | `fwconsole chown` then `fwconsole reload` |
| Permission errors in GUI/logs | `fwconsole chown` |

`fwconsole ma install` may trigger chown via `Moduleadmin::setPerms()`.

---

## Constraints

- Full chown requires root (`posix_geteuid() == 0`)
- `rdir` strips execute from child files — use `execdir` for scripts/binaries
- Blacklist checked before processing each file
- Hook return arrays merged with framework defaults via `array_merge_recursive`
- `freepbx_chown.conf` is optional — first run without it shows customization hint
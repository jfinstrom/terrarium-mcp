# Module Packaging and Repository Types

## Scope

How FreePBX classifies, distributes, and installs modules: repository channels, release tracks, tarball format, and local vs online packaging. Sources: `modulefunctions.class.php`, `module.xml`, `helloworld/.github/workflows/sign.sh`.

---

## Repository Types (`<repo>`)

Each module declares its distribution channel in `module.xml`:

```xml
<repo>unsupported</repo>
```

Framework recognizes five standard remote repository labels (i18n strings in `modulefunctions.class.php`):

| Repo | Purpose |
|------|---------|
| `standard` | Core Sangoma-supported modules (default enabled) |
| `extended` | Additional Sangoma modules beyond standard set |
| `commercial` | Licensed/commercial modules |
| `unsupported` | Community or third-party modules (e.g., `helloworld`) |
| `orphan` | Deprecated modules no longer maintained |

Modules without `<repo>` on disk default to `local` when read by `getinfo()`:

```php
if (!isset($modules[$file]['repo']) || !$modules[$file]['repo']) {
    $modules[$file]['repo'] = 'local';
}
```

---

## Active Repository Filtering

### `get_active_repos()`

Reads enabled repos from `module_xml.repos_json`. Defaults to `standard` only if unset:

```php
$active_repos = array('standard' => 1);
```

Migrates legacy `repos_serialized` → `repos_json` on first read.

### `set_active_repo($repo, $active)`

Toggles a repo on/off in `repos_json`. Used by Module Admin GUI (`displayRepoSelect()` in `moduleAdminFunctions.php`).

### Notification filtering

New-module notifications only appear for modules in **active** repos:

```php
if (isset($active_repos[$mod['repo']]) && $active_repos[$mod['repo']]) {
    $extext .= $mod['rawname']." (".$mod['version'].")<br />";
}
```

---

## Remote Repository Discovery

| Function | Storage Key | Behavior |
|----------|-------------|----------|
| `generate_remote_repos()` | `remote_repos_json` | Scans online module XML, collects unique `<repo>` values |
| `get_remote_repos($online)` | `remote_repos_json` | Returns cached list; filters `local` and `broken` |
| `set_remote_repos($repos)` | `remote_repos_json` | Stores list; auto-enables newly discovered repos (except `orphan`) |

New repos discovered online are automatically enabled unless the admin previously disabled them locally.

---

## Release Tracks

Framework i18n defines three track labels: **Stable**, **Beta**, **Nightly**.

Per-module track preference stored in `module_xml` id `track` (JSON map of `rawname → track`). `get_track($modulename)` defaults to `stable`.

Online XML also maintains separate `beta` and `edge` module lists in `module_xml`. When `MODULEADMINEDGE` is enabled, edge versions can supersede stable listings during `getonlinexml()` merge logic.

---

## Distribution Tarball Format

### Naming convention

Signed release tarballs follow:

```
{rawname}-{version}.tar.gz
```

Example from `helloworld` CI: `helloworld-15.0.1.tar.gz` (from `module.xml` `<rawname>` and `<version>`).

### Archive contents

Tarball root must contain `module.xml` either at top level or in a single subdirectory:

```
helloworld-15.0.1.tar.gz
└── helloworld/
    ├── module.xml          ← required
    ├── Helloworld.class.php
    ├── page.helloworld.php
    ├── views/
    ├── assets/
    └── ...
```

`_process_archive()` rejects archives with zero or multiple top-level directories when `module.xml` is not at root.

### Supported upload/download formats

| Format | Extensions |
|--------|------------|
| tar / gzip | `.tar`, `.tgz`, `.tar.gz` |
| zip | `.zip` (requires `unzip` binary) |
| bzip2 | `.bz2`, `.bz`, `.tbz2`, `.tbz` |
| GPG-wrapped | `.gpg` (verified and extracted before untar) |

---

## Download and Install Flow

```
Online repo URL
    → handledownload() / download()
    → _cache/{filename}
    → _process_archive()
    → extract to _cache/{uniqid}
    → validate module.xml + rawname
    → rm -rf admin/modules/{rawname}
    → move extracted dir to admin/modules/{rawname}
    → ready for fwconsole ma install
```

Cache directory: `{AMPWEBROOT}/admin/modules/_cache/`

Manual upload via GUI uses `handleupload()` with the same `_process_archive()` path.

---

## Signing at Package Time

CI/release builds produce `module.sig` alongside the tarball. `sign.sh` workflow:

1. SHA-256 hash every file (excluding patterns in `exclude.txt`)
2. Write `module.sig` with GPG clearsign
3. Create `{rawname}-{version}.tar.gz` excluding `.git`, `.github`, `.vscode`

See `28-module-signing.md` for runtime verification.

### Typical exclude patterns (`helloworld/.github/workflows/exclude.txt`)

```
**/.github/**
**/.git/**
**/.vscode/**
**/.gitattributes
```

---

## Packaging Checklist

| Item | Required |
|------|----------|
| `module.xml` with `<rawname>`, `<version>`, `<name>` | Yes |
| `<repo>` for online distribution | Recommended |
| BMO class `{Rawname}.class.php` | Yes (12+) |
| `install()` / `uninstall()` methods | Yes (replaces legacy `install.php`) |
| `page.{rawname}.php` for GUI | If module has admin page |
| `module.sig` | Required for official Sangoma repos |
| Version matches git tag (`v{version}`) | Convention in helloworld CI |

---

## Developer vs Official Modules

| Aspect | Official (`standard`/`extended`/`commercial`) | Local/unsupported |
|--------|-----------------------------------------------|-------------------|
| Signature | GPG-signed, verified on install | Typically unsigned |
| Distribution | Sangoma module mirror | GitHub release, manual upload, git clone |
| Notifications | Upgrade/security alerts from online XML | No online update tracking |
| `SIGNATURECHECK` | Strict for tampered files | Warning only for unsigned |

---

## Constraints

- `orphan` repo modules are never auto-enabled when discovered
- Repo names normalized to lowercase in `get_active_repos()`
- Download URL appended to online XML as `downloadurl` during mirror fetch
- Cannot install modules with revoked GPG signatures (see `28-module-signing.md`)
- Local dev modules should set `<repo>unsupported</repo>` or omit repo (becomes `local`)
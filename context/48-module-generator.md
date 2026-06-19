# Module Generator

## Scope

Expected scaffold structure for new BMO modules. Sources: `helloworld/`, `freepbx-gists/moduleclass.stub.php`, `helloworld/README.md`.

**Gap:** `freepbxgenerator.phar` is **not present** in cloned sources. Generator behavior below is reconstructed from the reference module and gists stub. Sangoma wiki may document the phar tool directly.

---

## Generator Tool Status

| Item | Status |
|------|--------|
| `freepbxgenerator.phar` | **Not in workspace** — external Sangoma/wiki tool |
| `helloworld` module | **Authoritative reference** for modern BMO layout |
| `moduleclass.stub.php` | **BMO class template** with AJAX/grid patterns |

`03-module-lifecycle.md` documents a legacy generator output that includes `install.php`/`uninstall.php`. Modern BMO modules (12+) use `install()`/`uninstall()` methods in the class file instead — `helloworld` has no `install.php`.

---

## Recommended Scaffold (Modern BMO)

Derived from `helloworld` on `release/15.0`:

```
{rawname}/
├── {Rawname}.class.php       # BMO primary class (namespace FreePBX\modules)
├── module.xml                # Manifest (metadata, depends, database, menuitems)
├── page.{rawname}.php        # Thin page entry → $freepbx->{Rawname}->showPage()
├── views/                    # HTML templates (no business logic)
│   ├── default.php
│   ├── form.php
│   └── grid.php
├── assets/
│   ├── js/{rawname}.js
│   └── css/                  # optional
├── Backup.php                # optional — backup engine integration (15+)
├── Restore.php               # optional — restore engine integration (15+)
├── Console/
│   └── {Rawname}.class.php   # optional — fwconsole commands
├── Api/
│   ├── Rest/                 # optional — REST API providers
│   └── Gql/                  # optional — GraphQL resolvers
├── ucp/                      # optional — User Control Panel module
│   ├── {Rawname}.class.php
│   ├── assets/
│   └── views/
├── .github/workflows/        # optional — CI signing (see 47-contribution-workflow.md)
│   ├── signrelease.yml
│   ├── sign.sh
│   └── exclude.txt
├── LICENSE.md
└── README.md
```

---

## Required Files (Minimum Viable Module)

### `module.xml`

```xml
<module>
    <rawname>myapp</rawname>
    <repo>unsupported</repo>
    <name>My Application</name>
    <version>1.0.0</version>
    <category>Applications</category>
    <menuitems>
        <myapp>My Application</myapp>
    </menuitems>
    <depends>
        <version>15.0</version>
    </depends>
</module>
```

See `06-module-xml-manifest.md` for full element reference.

### `{Rawname}.class.php`

From `moduleclass.stub.php` — minimum BMO contract:

```php
namespace FreePBX\modules;

class Myapp implements BMO
{
    public function __construct(FreePBX $freepbx) { ... }
    public function install() {}
    public function uninstall() {}
    public function doConfigPageInit($page) {}
}
```

Required even if empty. `install()` replaces legacy `install.php`; `uninstall()` replaces `uninstall.php`.

### `page.{rawname}.php`

```php
<?php
echo FreePBX::create()->Myapp->showPage();
```

Delegates all logic to the BMO class.

---

## Stub-Provided Optional Methods

`moduleclass.stub.php` includes patterns beyond the minimum contract:

| Method | Purpose |
|--------|---------|
| `getActionBar($request)` | Submit/Delete/Reset buttons per display |
| `ajaxRequest($req, &$setting)` | Declare handled AJAX commands |
| `ajaxHandler()` | Process AJAX (e.g., Bootstrap Table `getJSON`) |
| `getRightNav($request)` | Right-side navigation HTML |

Copy and customize from gists rather than generating from scratch.

---

## Legacy Generator Output (Unverified phar)

Referenced in `03-module-lifecycle.md` — may still be produced by `freepbxgenerator.phar`:

```
{rawname}/
├── install.php          ← legacy; BMO install() preferred
├── uninstall.php        ← legacy; BMO uninstall() preferred
└── ucp/ (optional)
```

If the phar generates `install.php`, migrate logic into `install()` before targeting FreePBX 15+.

---

## Post-Scaffold Steps

### Local development install

```bash
# Symlink or copy module into framework modules directory
ln -s /path/to/myapp /var/www/html/admin/modules/myapp

# Install and enable
fwconsole ma install myapp
fwconsole ma enable myapp
fwconsole reload
```

Generator phar historically auto-symlinked into the framework module directory — behavior not verifiable without the phar binary.

### Database tables

Declare schema in `module.xml` `<database>` section. Framework generates tables on `fwconsole ma install`. See `07-module-xml-database.md`.

### GUI wiring

1. Add `<menuitems>` entry in `module.xml`
2. Create `page.{rawname}.php` and `views/`
3. Implement `showPage()`, `doConfigPageInit()` in BMO class
4. See `12-gui-pages-views.md`

---

## helloworld Feature Coverage

From `helloworld/README.md` scope checklist:

| Feature | helloworld status |
|---------|-------------------|
| Basic structure | Done |
| Database read/write | Done |
| GUI page + form + submission | Done |
| Dialplan | Done |
| Backup/Restore (`Backup.php`/`Restore.php`) | Done |
| Config file read/write | Not implemented |
| Page hooks | TODO |

Use helloworld as the canonical example for implemented features; gists stub for AJAX/grid boilerplate.

---

## Naming During Generation

When creating a new module, apply conventions from `42-naming-conventions.md`:

| Input | Output |
|-------|--------|
| rawname `myapp` | Class `Myapp`, file `Myapp.class.php` |
| rawname `my-module` | Class `Mydash` (hyphen → dash) |
| GUI display | Matches `<menuitems>` key = rawname |
| Page file | `page.myapp.php` |

---

## Constraints

- `freepbxgenerator.phar` not available for verification — treat Sangoma wiki as authoritative for phar-specific flags and auto-install behavior
- Modern modules should not rely on `install.php`/`uninstall.php` — use BMO methods
- Generator output may omit `Backup.php`/`Restore.php`, `Api/`, `Console/` — add manually when needed
- Set `<repo>unsupported</repo>` for community modules
- Class must implement `BMO` interface and live in `FreePBX\modules` namespace
- No closing `?>` in PHP files (see `43-code-style-conventions.md`)
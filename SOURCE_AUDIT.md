# Source Audit — Context File Verification

**Audit Date:** 2026-06-18  
**Scope:** All 48 context files (Tiers 1–6)

---

## Audit Method

Each context file was checked against cloned sources in `sources/`:

| Repo | Role |
|------|------|
| `framework` | Primary source of truth |
| `helloworld` | Reference BMO module |
| `backup` | BackupBase/RestoreBase, GQL provider, SSH restrict |
| `api` | Gql/Rest Base, ApiBase, OAuth, ApiBaseTestCase |
| `freepbx-dev-docs` | Supplemental documentation |
| `freepbx-gists` | Examples |

Claims without source backing were corrected or flagged.

---

## Corrections Applied (2026-06-18)

| File | Issue | Fix |
|------|-------|-----|
| `03-module-lifecycle.md` | Claimed BMO `upgrade()` called on upgrade | Corrected: `fwconsole ma upgrade` → `install()` only; `upgrade()` never invoked in framework |
| `18-dialplan-injection.md` | Referenced `retrieve_conf` as active entry point | Updated to `fwconsole reload`; noted `retrieve_conf` deprecation |
| `21-feature-codes.md` | `{modulename},{featurename}` destination format | Flagged unverified; `providedest` field confirmed, format not in cloned sources |
| `16-hooks-system.md` | `retrieve_conf` for FileHooks | Changed to `fwconsole reload` |
| `17-hook-response-patterns.md` | `processHooks($payload)` implied named param | Clarified backtrace discovery + `func_get_args()` forwarding |
| `05-external-bootstrap.md` | Same `processHooks($payload)` wording | Clarified argument forwarding |

---

## Verified Claims (Key Mechanisms)

| Claim | Source |
|-------|--------|
| `processHooks()` uses backtrace level 2 | `Hooks.class.php:348-350` |
| `fwconsole` loads commands from `module.xml` | `amp_conf/bin/fwconsole:89-135` |
| Legacy `Console/` scan deprecated | `fwconsole:137` LOG_WARNING |
| `retrieve_conf` → `fwconsole reload --dont-reload-asterisk` | `amp_conf/bin/retrieve_conf:9` |
| Reload dialplan via `DialplanHooks::processHooks` | `Reload.class.php:316-325` |
| `Cron` class wraps crontab with locks | `BMO/Cron.class.php` |
| `SIGNATURECHECK` controls validation | `Reload.class.php:440`, `config.php:613` |
| GPG state bitmask constants | `GPG.class.php:22+` |
| `BackupBase`/`RestoreBase` API | `backup/BackupBase.php`, `backup/RestoreBase.php` |
| Doctrine `migrate()->modifyMultiple()` | `freepbx-dev-docs`, `Database/Migration.class.php` |
| `providedest` column in featurecodes | `featurecodes.class.php:9`, `module.xml:86` |
| `upgrade()` documented but not called | `BMO.interface.php:50-53`, `_runscripts()` install case only |

---

## Flagged / Partial Coverage

| Topic | Status | Notes |
|-------|--------|-------|
| Feature code destination string format | **Unverified** | `providedest` confirmed; format likely in `core` module (not cloned) |
| Chown hook `module.xml` example | **Derived** | Pattern from `Chown::fwcChownFiles()` + backtrace; no working module example in workspace |
| `cronmanager` table usage | **Legacy** | Table in `module.xml`; `cronmanager.class.php` absent from current framework |
| `skip_db` bootstrap setting | **Not found** | Zero matches in framework source; correctly absent from context files |
| Core module dialplan/destinations | **Not cloned** | Some destination/feature-code behavior requires `core` repo |
| UCP runtime (`ucp` module) | **Not cloned** | Framework autoload + guards only; widget API in `ucp` module |
| `sysadmin` module | **Not cloned** | `Schmooze\Zend`, `ApiHooks()->runModuleSystemHook()` |
| FastAGI server lifecycle | **Not cloned** | `Core::fastAGIStatus()` in core module |
| Module REST provider example | **Not cloned** | Only framework `System` REST verified; helloworld documents convention |
| `freepbxgenerator.phar` | **Not in workspace** | Scaffold derived from helloworld + gists; phar flags/behavior unverified |
| Sangoma contribution/PR process | **Not documented** | Only helloworld CI signing workflow verified |

---

## Per-File Source Mapping

| File | Primary Sources |
|------|-----------------|
| 01 | `bootstrap.php`, `freepbx.conf` template |
| 02 | `FreePBX.class.php`, `Self_Helper.class.php`, `BMO.interface.php` |
| 03 | `modulefunctions.class.php`, `Moduleadmin.class.php`, `BMO.interface.php` |
| 04 | `functions.inc.php`, BMO coexistence patterns |
| 05 | `bootstrap.php`, `/etc/freepbx.conf` |
| 06–07 | `module.xml`, dev-docs |
| 08 | `helloworld/Helloworld.class.php`, `BMO.interface.php` |
| 09–10 | `Database.class.php`, `DB_Helper.class.php`, dev-docs |
| 11 | `Request_Helper.class.php` |
| 12–14 | `helloworld/page.*.php`, views, GUI patterns |
| 15 | `ajax.php`, `BMO/Ajax.class.php` |
| 16–17 | `Hooks.class.php`, dev-docs general-module-hooks |
| 18 | `Reload.class.php`, `DialplanHooks.class.php` |
| 19 | `WriteConfig`, `genConfig`/`writeConfig` patterns |
| 20 | `helloworld/assets/`, reload symlink logic |
| 21 | `featurecodes.class.php`, `featurecodes.functions.php` |
| 22 | `Destinations.class.php` |
| 23 | `fwconsole`, `helloworld/Console/Helloworld.class.php` |
| 24 | `Reload.class.php`, `retrieve_conf` |
| 25 | `Cron.class.php`, `UpdateManager.php` |
| 26 | `helloworld/Backup.php`, `backup/BackupBase.php` |
| 27 | dev-docs doctrine doc, `Migration.class.php` |
| 28 | `GPG.class.php`, `modulefunctions.class.php` |
| 29 | `Chown.class.php`, `freepbx_chown.conf` format |
| 30 | `functions.inc.php` PSR-4, `login.php`, helloworld README |
| 31 | `api/Gql/Base.php`, `framework/Api/Gql/`, `backup/Api/Gql/` |
| 32 | `api/Rest/Base.php`, `framework/Api/Rest/System.php` |
| 33 | `extensions.class.php` ext_agi (core fastAGIStatus external) |
| 34 | `api/Includes/ApiBase.php`, `backup` SSH restrict, `Framework.class.php` |
| 35 | `Modules.class.php::loadLicensedFileCheck()` |
| 36 | `modgettext.class.php`, `View.class.php`, `Localization.class.php` |
| 37 | `phpunit.xml`, `utests/`, `api/utests/ApiBaseTestCase.php` |
| 38 | `php-asmanager.php`, `PKCS.class.php`, `Realtime.class.php` |
| 39 | `Search.class.php`, `Ajax.class.php` |
| 40 | `Notifications.class.php`, `module.xml` notifications table |
| 41 | `Job.class.php`, `Console/Job.class.php`, `Job/Job.php` |
| 42 | `Modules.class.php::cleanModuleName()`, `helloworld/`, `moduleclass.stub.php` |
| 43 | Framework PHP files (vim modeline), `helloworld/` style |
| 44 | `bootstrap.php` Whoops handlers, `freepbx_error_handler` |
| 45 | `libraries/Composer/composer.json` |
| 46 | `modulefunctions.class.php` (repos, tracks, `_process_archive`), `sign.sh` |
| 47 | `helloworld/.github/workflows/signrelease.yml`, `moduleAdminFunctions.php` |
| 48 | `helloworld/` structure, `moduleclass.stub.php`, `03-module-lifecycle.md` (legacy phar note) |

---

## Tier 6 Audit Notes (2026-06-18)

| File | Verified | Flagged |
|------|----------|---------|
| 46 | Repo types, `repos_json`, tarball naming, archive formats | Nightly track label in i18n; per-module track usage limited to `get_track()` default |
| 47 | Branch prefixes in CI, sign/release flow, FREEPBX comment pattern | Mandatory `FREEPBX-XXXXX` branch names **not verified**; Sangoma internal PR process **not in sources** |
| 48 | helloworld scaffold, BMO stub methods | `freepbxgenerator.phar` **not in workspace**; legacy `install.php` output unverified |

---

## Recommendations for Future Tiers

1. Clone `core` module before writing destination/feature-code deep dives
2. Verify chown hook with a module that implements `fwcChownFiles` handler
3. Cross-check Sangoma wiki claims against framework source before documenting
4. Re-audit after each tier completion
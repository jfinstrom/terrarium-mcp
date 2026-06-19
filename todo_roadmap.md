# FreePBX LLM Context — Topic Roadmap

**Last Updated:** 2026-06-18  
**Sources Analyzed:** `FreePBX/framework`, `jfinstrom/helloworld`, `jfinstrom/freepbx-dev-docs`, `jfinstrom/FreePBX-gists`, Sangoma Developer Wiki

---

## Status Legend

| Status | Meaning |
|--------|---------|
| `Complete` | Context file written and grounded in source |
| `In Progress` | Currently being authored |
| `Pending` | Identified, not yet started |
| `Discovered` | Found during parsing; appended dynamically |

---

## Priority Tier 1 — Framework Foundation (System Dependency)

These files ground all other development. Must be loaded first by downstream LLM agents.

| # | Topic | Output File | Complexity | Status | Dependencies |
|---|-------|-------------|------------|--------|--------------|
| 1.1 | Bootstrap chain, `$amp_conf`, `$astman`, `$db`, `$bmo` globals | `context/01-bootstrap-and-global-state.md` | Medium | **Complete** | framework `bootstrap.php` |
| 1.2 | BMO architecture: `FreePBX` class, helper inheritance, autoloading | `context/02-bmo-architecture.md` | High | **Complete** | 1.1 |
| 1.3 | Module lifecycle: install/uninstall/upgrade, `fwconsole ma` | `context/03-module-lifecycle.md` | Medium | **Complete** | 1.2 |
| 1.4 | Legacy `functions.inc.php` coexistence with BMO | `context/04-functions-inc-legacy.md` | Medium | **Complete** | 1.2 |
| 1.5 | External bootstrap (non-module PHP accessing FreePBX) | `context/05-external-bootstrap.md` | Medium | **Complete** | 1.1 |

---

## Priority Tier 2 — Core Module Development

Required for any new BMO module. Reference: `helloworld` module.

| # | Topic | Output File | Complexity | Status | Dependencies |
|---|-------|-------------|------------|--------|--------------|
| 2.1 | `module.xml` manifest structure (metadata, depends, breaking) | `context/06-module-xml-manifest.md` | Medium | **Complete** | 1.3 |
| 2.2 | `module.xml` `<database>` section and schema generation | `context/07-module-xml-database.md` | Medium | **Complete** | 2.1 |
| 2.3 | BMO class contract: `Modulename.class.php`, namespace, interface | `context/08-bmo-class-interface.md` | High | **Complete** | 1.2 |
| 2.4 | PDO database patterns via `$freepbx->Database` | `context/09-database-pdo-patterns.md` | Medium | **Complete** | 2.3 |
| 2.5 | KVStore via `DB_Helper` / `getConfig`/`setConfig` | `context/10-kvstore-config.md` | Medium | **Complete** | 2.3 |
| 2.6 | `Request_Helper`: `getReq`, `importRequest`, sanitization | `context/11-request-helper.md` | Low | **Complete** | 2.3 |
| 2.7 | GUI page routing: `page.*.php`, `showPage`, views | `context/12-gui-pages-views.md` | Medium | **Complete** | 2.3 |
| 2.8 | Action bar, right nav, `getActionBar`/`getRightNav` | `context/13-gui-action-bar.md` | Low | **Complete** | 2.7 |
| 2.9 | Bootstrap Table grid patterns (AJAX data grids) | `context/14-bootstrap-table-grids.md` | Medium | **Complete** | 2.7, 3.1 |

---

## Priority Tier 3 — Framework Integration Systems

| # | Topic | Output File | Complexity | Status | Dependencies |
|---|-------|-------------|------------|--------|--------------|
| 3.1 | AJAX routing: `ajax.php`, `ajaxRequest`, `ajaxHandler` | `context/15-ajax-routing.md` | High | **Complete** | 2.3 |
| 3.2 | Hooks system: `myGuiHooks`, `myDialplanHooks`, `module.xml` hooks | `context/16-hooks-system.md` | High | **Complete** | 1.2 |
| 3.3 | Hook response processing (merge, veto, aggregate patterns) | `context/17-hook-response-patterns.md` | Medium | **Complete** | 3.2 |
| 3.4 | Dialplan injection: `doDialplanHook`, `retrieve_conf` | `context/18-dialplan-injection.md` | High | **Complete** | 3.2 |
| 3.5 | Asterisk config file generation: `genConfig`/`writeConfig` | `context/19-asterisk-config-generation.md` | High | **Complete** | 3.2 |
| 3.6 | Asset pipeline: `assets/js`, `assets/css`, `assets/less` | `context/20-asset-pipeline.md` | Low | **Complete** | 2.7 |
| 3.7 | Feature codes: `featurecode` class, dialplan binding | `context/21-feature-codes.md` | Medium | **Complete** | 3.4 |
| 3.8 | Destinations framework integration | `context/22-destinations-framework.md` | Medium | **Complete** | 3.4 |

---

## Priority Tier 4 — CLI, Jobs, and Operations

| # | Topic | Output File | Complexity | Status | Dependencies |
|---|-------|-------------|------------|--------|--------------|
| 4.1 | `fwconsole` CLI: module `Console/` commands | `context/23-fwconsole-cli.md` | Medium | **Complete** | 1.3 |
| 4.2 | `fwconsole reload`, `retrieve_conf`, apply config flow | `context/24-reload-apply-config.md` | High | **Complete** | 3.4 |
| 4.3 | Cron job registration via BMO | `context/25-cron-jobs.md` | Medium | **Complete** | 1.2 |
| 4.4 | Backup/Restore: `Backup.php`, `Restore.php` classes | `context/26-backup-restore.md` | High | **Complete** | 1.3 |
| 4.5 | Doctrine database migrations (external) | `context/27-doctrine-migrations.md` | High | **Complete** | 2.4 |
| 4.6 | Module signing and integrity validation | `context/28-module-signing.md` | Medium | **Complete** | 1.3 |
| 4.7 | `chown.conf` and file permission model | `context/29-chown-permissions.md` | Low | **Complete** | 4.2 |

---

## Priority Tier 5 — Advanced Ecosystem

| # | Topic | Output File | Complexity | Status | Dependencies |
|---|-------|-------------|------------|--------|--------------|
| 5.1 | UCP (User Control Panel) module development | `context/30-ucp-integration.md` | High | **Complete** | 2.3 |
| 5.2 | GraphQL API (`Api/Gql/` framework classes) | `context/31-graphql-api.md` | High | **Complete** | 1.2 |
| 5.3 | REST Apps / API endpoints | `context/32-restapps-api.md` | High | **Complete** | 1.2 |
| 5.4 | FastAGI handling patterns | `context/33-fastagi.md` | High | **Complete** | 3.4 |
| 5.5 | Secure API endpoint patterns | `context/34-secure-api-endpoints.md` | High | **Complete** | 5.2 |
| 5.6 | IONCube / commercial module licensing (`Schmooze\Zend`) | `context/35-commercial-licensing.md` | Medium | **Complete** | 1.3 |
| 5.7 | i18n / localization (`_()`, `modgettext`) | `context/36-i18n-localization.md` | Low | **Complete** | 2.7 |
| 5.8 | Unit testing framework (`utests/`, PHPUnit) | `context/37-unit-testing.md` | Medium | **Complete** | 1.2 |
| 5.9 | PKCSTest / realtime / Astman integration | `context/38-astman-manager.md` | High | **Complete** | 1.1 |
| 5.10 | Search integration (`Search.class.php`) | `context/39-search-integration.md` | Low | **Complete** | 3.1 |
| 5.11 | Notifications framework | `context/40-notifications.md` | Medium | **Complete** | 1.2 |
| 5.12 | Job queue (`fwconsole job`) | `context/41-job-queue.md` | Medium | **Complete** | 4.1 |

---

## Priority Tier 6 — Ecosystem Patterns & "Isms"

| # | Topic | Output File | Complexity | Status | Dependencies |
|---|-------|-------------|------------|--------|--------------|
| 6.1 | Naming conventions: rawname, CamelCase class, namespace rules | `context/42-naming-conventions.md` | Low | **Complete** | 2.3 |
| 6.2 | PHP indentation: tabs, `vim: set ai ts=4 sw=4 ft=php` | `context/43-code-style-conventions.md` | Low | **Complete** | — |
| 6.3 | Error handling: Whoops, `freepbx_error_handler`, exceptions | `context/44-error-handling.md` | Medium | **Complete** | 1.1 |
| 6.4 | Composer vendor libraries available in framework | `context/45-framework-libraries.md` | Low | **Complete** | 1.2 |
| 6.5 | Module packaging, repo types (`standard`, `extended`, `unsupported`) | `context/46-module-packaging.md` | Medium | **Complete** | 1.3 |
| 6.6 | Git workflow: release branches, bugfix/FREEPBX-XXXXX | `context/47-contribution-workflow.md` | Low | **Complete** | — |
| 6.7 | Module generator (`freepbxgenerator.phar`) output structure | `context/48-module-generator.md` | Low | **Complete** | 2.1 |

---

## Dynamically Discovered Topics (Append-Only Log)

| Date | Topic | Reason Discovered | Added To |
|------|-------|-------------------|----------|
| 2026-06-18 | Cron job registration | `BMO/Cron.class.php` in framework | Tier 4.3 |
| 2026-06-18 | GraphQL API layer | `libraries/Api/Gql/` directory | Tier 5.2 |
| 2026-06-18 | Commercial IONCube licensing | `Modules::loadLicensedFileCheck()` | Tier 5.6 |
| 2026-06-18 | Job queue system | `Console/Job.class.php` | Tier 5.12 |
| 2026-06-18 | Whoops error handlers per context | `bootstrap.php` JsonResponseHandler vs PrettyPageHandler | Tier 6.3 |
| 2026-06-18 | Performance stamping | `Performance->Stamp()` in DialplanHooks | Tier 3.4 (note) |
| 2026-06-18 | `GuiHooks::doConfigPageInits` orchestration | Separate from module `doConfigPageInit` | Tier 3.2 (note) |
| 2026-06-18 | Source audit pass | Verified 29 files; fixed 6 hallucinations | `SOURCE_AUDIT.md` |
| 2026-06-18 | `backup` module cloned | `BackupBase`/`RestoreBase` API for Tier 4.4 | `sources/backup` |
| 2026-06-18 | `api` module cloned | GQL/REST base classes, OAuth, ApiBaseTestCase | `sources/api` |

---

## Completion Summary

| Tier | Total | Complete | In Progress | Pending/Discovered |
|------|-------|----------|-------------|-------------------|
| 1 — Foundation | 5 | 5 | 0 | 0 |
| 2 — Core Dev | 9 | 9 | 0 | 0 |
| 3 — Integration | 8 | 8 | 0 | 0 |
| 4 — CLI/Ops | 7 | 7 | 0 | 0 |
| 5 — Advanced | 12 | 12 | 0 | 0 |
| 6 — Patterns | 7 | 7 | 0 | 0 |
| **Total** | **48** | **48** | **0** | **0** |

---

## Next Actions (Sequential Build Order)

1. ~~`04-functions-inc-legacy.md`~~ ✓
2. ~~`05-external-bootstrap.md`~~ ✓
3. ~~Tier 2 (11–14)~~ ✓
4. ~~Tier 3 (16–22)~~ ✓
5. ~~Tier 4 (23–29)~~ ✓ + source audit (`SOURCE_AUDIT.md`)
6. ~~Tier 5 (30–41)~~ ✓
7. ~~Tier 6 (42–48)~~ ✓
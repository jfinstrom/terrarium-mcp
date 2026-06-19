# Contribution Workflow

## Scope

Git branching, release automation, and ticket-reference conventions observable in cloned FreePBX module repos. Sources: `helloworld/.github/workflows/`, `helloworld/README.md`, `moduleAdminFunctions.php`, framework source comments.

**Limitation:** Full Sangoma internal review/merge process is not documented in cloned sources. This file covers only verifiable repo patterns.

---

## Repository Branch Conventions

### helloworld reference module

Cloned branch: `release/15.0` (tracks FreePBX 15.x).

### CI-triggered branch prefixes

`signrelease.yml` runs on push to:

| Branch pattern | Purpose |
|----------------|---------|
| `release/*` | Versioned release builds (e.g., `release/15.0`) |
| `bugfix/*` | Bug-fix branches |
| `feature/*` | Feature development branches |

All three prefixes trigger the same sign-and-release workflow.

---

## Automated Release Pipeline

On push to qualifying branches, GitHub Actions (`signrelease.yml`):

```
1. Checkout repository
2. Install gnupg + xmlstarlet
3. Import GPG_SIGNING_KEY secret
4. Extract <version> and <rawname> from module.xml
5. Run sign.sh → module.sig + {rawname}-{version}.tar.gz
6. Create GitHub Release tag v{version} with tarball attached
```

### sign.sh responsibilities

| Step | Output |
|------|--------|
| Parse `module.xml` for version/rawname | Tarball name |
| SHA-256 hash all module files | `module.sig` `[hashes]` section |
| GPG clearsign signature file | `module.sig` |
| `tar -czf` with exclude list | `{rawname}-{version}.tar.gz` |

Release tag format: `v{version}` (e.g., `v15.0.1` from helloworld `module.xml`).

---

## Version and Manifest Discipline

Before pushing a release branch:

1. Bump `<version>` in `module.xml`
2. Update `<changelog>` with release notes
3. Ensure `<rawname>` matches directory name and BMO class file prefix
4. Push to appropriate branch (`release/*`, `bugfix/*`, or `feature/*`)
5. CI produces signed tarball and GitHub release automatically

---

## Ticket Reference Conventions

### Source code comments

Framework and module sources reference Jira tickets inline:

```php
// FREEPBX-7204 - Discard any cruft, errors, etc, that may have been
// http://issues.freepbx.org/browse/FREEPBX-9898
```

Pattern: `FREEPBX-{number}` in comments linking to `http://issues.freepbx.org/browse/FREEPBX-{number}`.

**Not verified:** Branch names containing `FREEPBX-XXXXX` as a mandatory convention. Only `release/*`, `bugfix/*`, `feature/*` are confirmed in CI config.

### Changelog ticket linking

`moduleAdminFunctions.php::jira_replace_ticket()` auto-links ticket numbers in changelogs:

```php
// Matches 'FREEPBX-nnn', 'FPBXDISTRO-nnn' → Jira browse URL
function jira_replace_ticket($match) {
    $baseurl = 'http://issues.freepbx.org/browse/'.$match[1].'-';
    ...
}
```

Changelog entries commonly use `*version*` prefix format:

```xml
<changelog>
    *15.0.1* FREEPBX-12345 Fix something
    *14.0.1* Code cleanup
</changelog>
```

Also supports Sangoma Atlassian tickets (`sangoma_atlassian_replace_ticket()`).

---

## Code Style and Uniformity

helloworld README references:

- [FreePBX Uniformity Guidelines](http://wiki.freepbx.org/x/goDNAQ) — external wiki
- [FreePBX-gists](https://github.com/jfinstrom/FreePBX-gists) — code snippets and stubs

Local conventions documented in context:

| Topic | File |
|-------|------|
| Naming (rawname, class, namespace) | `42-naming-conventions.md` |
| PHP style (tabs, vim modeline) | `43-code-style-conventions.md` |
| Error handling | `44-error-handling.md` |

---

## Module Development Lifecycle (Observed)

```
feature/* or bugfix/*
    → development + local testing (fwconsole ma install)
    → merge to release/{major}.{minor}
    → bump module.xml version
    → CI signs + publishes GitHub release
    → users install via Module Admin or manual tarball upload
```

For unsupported/community modules, signing is optional. Unsigned modules generate warnings when `SIGNATURECHECK` is enabled but remain functional.

---

## What Is NOT in Cloned Sources

| Topic | Status |
|-------|--------|
| Sangoma code review / PR approval process | **Not documented** |
| Mandatory `FREEPBX-XXXXX` branch naming | **Not verified** — only comment/changelog usage confirmed |
| Module submission to official `standard` repo | **Not documented** — requires Sangoma partnership |
| `freepbxgenerator.phar` workflow | **External** — see `48-module-generator.md` |

---

## Practical Contribution Paths

### Community / third-party module

1. Fork or create repo following `helloworld` structure
2. Set `<repo>unsupported</repo>` in `module.xml`
3. Use `release/*` branch + CI signing (optional) or distribute tarball manually
4. Document in README; link to FreePBX wiki/gists for patterns

### Framework bug fix

1. Clone `FreePBX/framework` on appropriate release branch
2. Reference `FREEPBX-{number}` in commit comments when applicable
3. Follow framework code style (`43-code-style-conventions.md`)
4. Submit via Sangoma's established contribution channel (external to this workspace)

---

## Constraints

- GPG signing in CI requires `GPG_SIGNING_KEY` GitHub secret — official Sangoma keys not available to third parties
- `sign.sh` uses key ID `268C8DD0` for clearsign — Sangoma infrastructure key
- Release workflow assumes single-module repo root layout (not monorepo)
- Branch `release/15.0` in helloworld does not imply all modules use identical branch naming — verify per-repo
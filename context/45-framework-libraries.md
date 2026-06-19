# Framework Composer Libraries

## Scope

Third-party PHP libraries bundled with framework via Composer. Available to all modules through framework bootstrap autoload. Source: `libraries/Composer/composer.json`, `bootstrap.php` Composer include.

**Path:** `{AMPWEBROOT}/admin/libraries/Composer/vendor/`

---

## Autoload Access

Composer autoload loaded during `bootstrap.php` — no module-level `composer.json` needed for these libraries.

```php
// Already available after bootstrap
use Symfony\Component\Console\Command\Command;
use Doctrine\DBAL\Connection;
use GuzzleHttp\Client;
```

Modules with their own `vendor/` (e.g., `backup`) load additional libraries independently.

---

## Core Dependencies (from `composer.json`)

### CLI and Process

| Package | Use in FreePBX |
|---------|----------------|
| `symfony/console` | `fwconsole` commands |
| `symfony/process` | `freepbx_get_process_obj()`, backup/API async |
| `wrep/daemonizable-command` | Long-running console commands |

### HTTP and API

| Package | Use in FreePBX |
|---------|----------------|
| `guzzlehttp/guzzle` | HTTP client |
| `rmccue/requests` | HTTP requests (legacy paths) |
| `slim/slim` | REST API routing (`api` module) |

### Database and ORM

| Package | Use in FreePBX |
|---------|----------------|
| `doctrine/dbal` | `FreePBX\Database`, migrations |
| `doctrine/orm` | ORM layer |
| `doctrine/cache` | Caching |

### Security

| Package | Use in FreePBX |
|---------|----------------|
| `symfony/security-core` | Security components |
| `symfony/security-http` | HTTP security |
| `symfony/security-csrf` | CSRF protection |
| `symfony/security-guard` | Guard authentication |
| `symfony/password-hasher` | Password hashing |

### Error Handling and Debug

| Package | Use in FreePBX |
|---------|----------------|
| `filp/whoops` | Exception pretty-pages (`44-error-handling.md`) |
| `php-console/php-console` | Browser PHP console debug |
| `symfony/var-dumper` | Debug output |

### Filesystem and Archive

| Package | Use in FreePBX |
|---------|----------------|
| `symfony/filesystem` | `fwconsole chown` file operations |
| `symfony/finder` | File discovery |
| `splitbrain/php-archive` | Archive handling |
| `alchemy/zippy` | Archive compression |

### Scheduling and Locking

| Package | Use in FreePBX |
|---------|----------------|
| `mtdowling/cron-expression` | `FreePBX\Job` cron validation |
| `symfony/lock` | Cron tab locks, job runner locks |
| `malkusch/lock` | Additional locking |

### Utilities

| Package | Use in FreePBX |
|---------|----------------|
| `ramsey/uuid` | UUID generation (`modulefunctions.class.php`) |
| `nesbot/carbon` | Date/time |
| `fightbulc/moment` | Date formatting |
| `respect/validation` | Input validation |
| `neitanod/forceutf8` | UTF-8 normalization |
| `giggsey/libphonenumber-for-php` | Phone number parsing |
| `mobiledetect/mobiledetectlib` | Mobile detection |
| `sinergi/browser-detector` | Browser detection |
| `monolog/monolog` | Logging (backup module) |
| `swiftmailer/swiftmailer` | Email |
| `sepia/po-parser` | PO file parsing (localization) |
| `simplepie/simplepie` | RSS/feed parsing |
| `tedivm/jshrink` | JavaScript minification |
| `povils/figlet` | ASCII art (CLI motd) |
| `hhxsv5/php-sse` | Server-sent events |
| `composer/ca-bundle` | SSL CA certificates |
| `brick/math` | Arbitrary precision math |

### Symfony Support

Polyfills for PHP 7.x compatibility: `symfony/polyfill-php70` through `php73`, plus `polyfill-mbstring`, `polyfill-iconv`, `polyfill-ctype`, etc.

---

## GraphQL (via api module)

GraphQL libraries used by `api` module (check `api/composer.json` for versions):

- `webonyx/graphql-php`
- `graphql-php/graphql-relay-php`

Not in framework `composer.json` — loaded when `api` module installed.

---

## Usage Guidance

| Do | Don't |
|----|-------|
| Use framework vendor for standard needs | Add duplicate packages to module `composer.json` unnecessarily |
| Check if BMO wrapper exists first | Import raw vendor when `FreePBX\Cron`, `Database`, etc. exist |
| Pin compatible versions in module composer | Conflict with framework's Doctrine/Symfony versions |

---

## PHP Version

Framework `composer.json` requires `php: ^8.2` with platform config `8.1.0`.

---

## Constraints

- Vendor path is framework-owned — do not modify `libraries/Composer/vendor/`
- Module-specific libraries go in `{module}/vendor/` with module `composer.json`
- Autoload suffix: `pbxframework`
- Not all vendor packages have FreePBX wrappers — grep framework source before assuming patterns
- Slim/GraphQL primarily used by `api` module, not directly in most BMO modules
# REST Apps API

## Scope

OAuth-scoped REST endpoints via Slim/PSR-7 middleware. Framework ships `System` provider; modules add `Api/Rest/` classes. Source: `api/Rest/Base.php`, `framework/libraries/Api/Rest/System.php`.

**Dependency:** `api` module must be installed and enabled.

---

## Namespace / Path Conventions

| Layer | Namespace | File Path |
|-------|-----------|-----------|
| Framework REST | `FreePBX\Api\Rest\{Class}` | `framework/.../libraries/Api/Rest/{Class}.php` |
| Module REST | `FreePBX\modules\{Module}\Api\Rest\{Class}` | `{module}/Api/Rest/{Class}.php` |
| Base class | `FreePBX\modules\Api\Rest\Base` | `api/Rest/Base.php` |

Autoload: `'FreePBX\\Api\\Rest\\' => 'libraries/Api/Rest'`.

helloworld README documents `Api/Rest/` convention; no implementation in helloworld clone.

---

## Provider Class Contract

Extend `FreePBX\modules\Api\Rest\Base`:

| Method | Purpose |
|--------|---------|
| `public static function getScopes()` | Declare OAuth scopes |
| `public function setupRoutes($app)` | Register Slim routes on `$app` |

Base provides scope middleware helpers.

---

## Scope Middleware

```php
$app->get('/version', function ($request, $response, $args) {
	$data = ['status' => true, 'version' => getVersion()];
	$response->getBody()->write(json_encode($data));
	return $response->withHeader('Content-Type', 'application/json');
})->add($this->checkReadScopeMiddleware('system'));
```

| Middleware Method | Scope Required |
|-------------------|----------------|
| `checkReadScopeMiddleware('system')` | `read:system` |
| `checkWriteScopeMiddleware('modules')` | `write:modules` |
| `checkAllReadScopeMiddleware()` | `read` or module read |
| `checkAllWriteScopeMiddleware()` | `write` or module write |

Unauthorized requests return `{"status": false, "message": "unauthorized"}`.

Middleware reads `oauth_scopes` from PSR-7 request attributes set by `api` module OAuth layer.

---

## Framework Provider — `FreePBX\Api\Rest\System`

`protected $module = 'framework'`

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/version` | FreePBX version |
| GET | `/engine` | Asterisk engine version |
| GET | `/needreload` | Reload needed flag |
| PUT | `/reload` | Async apply config |
| GET | `/apistatus/{txnId}` | Poll async transaction status |

Async reload pattern:

```php
$txnId = $freepbx->api->addTransaction("Processing", "Framework", "rest-do-reload");
$freepbx->api->setGqlApiHelper()->doreload($txnId);
// Returns txnId; poll /apistatus/{txnId}
```

---

## Module REST Scaffold

```php
<?php
namespace FreePBX\modules\Mymodule\Api\Rest;

use FreePBX\modules\Api\Rest\Base;

class Mymodule extends Base
{
	protected $module = 'mymodule';

	public static function getScopes()
	{
		return [
			'read:mymodule' => ['description' => _('Read mymodule')],
			'write:mymodule' => ['description' => _('Write mymodule')],
		];
	}

	public function setupRoutes($app)
	{
		$app->get('/items', function ($request, $response, $args) {
			$data = ['status' => true, 'items' => []];
			$response->getBody()->write(json_encode($data));
			return $response->withHeader('Content-Type', 'application/json');
		})->add($this->checkAllReadScopeMiddleware());
	}
}
```

**No module REST implementation** found in helloworld or backup clones — backup uses GQL only.

---

## REST vs GraphQL

| Aspect | REST | GraphQL |
|--------|------|---------|
| Base class | `Api\Rest\Base` | `Api\Gql\Base` |
| Registration | `setupRoutes($app)` | `queryCallback()` / `mutationCallback()` |
| Scope middleware | Per-route `->add()` | In callback guards |
| Response format | JSON via PSR-7 | GraphQL schema |

Both share `ApiBase` scope checking and OAuth token validation.

---

## Deprecated: `restapi` Module

Framework warns when `restapi` module is enabled:

> restapi module is deprecated... functionality moving to api module starting in PBX version 16

From `modulefunctions.class.php` notification check.

---

## Constraints

- All routes must attach scope middleware
- Return JSON with `Content-Type: application/json`
- Long operations use `addTransaction()` + status polling
- `api` module handles OAuth client registration and token issuance
- Module REST classes discovered automatically when `api` module scans active modules
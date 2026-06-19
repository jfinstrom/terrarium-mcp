# AJAX Routing

## Scope

BMO AJAX request pipeline from `ajax.php` through module `ajaxRequest`/`ajaxHandler` methods.

---

## Request URL Format

```
/admin/ajax.php?module={rawname}&command={command}&{extra_params}
```

Examples:

```
ajax.php?module=helloworld&command=getJSON&jdata=grid
ajax.php?module=framework&command=getConfig
ajax.php?module=search&command=query
```

---

## Entry Point Flow

```
ajax.php
  → validate module name (regex: ^[\w-]{3,99}$)
  → $bootstrap_settings['freepbx_auth'] = false
  → $bootstrap_settings['whoops_handler'] = 'JsonResponseHandler'
  → $restrict_mods = true
  → include /etc/freepbx.conf
  → modgettext::textdomain($module)
  → $bmo->Ajax->doRequest($module, $command)
```

---

## `Ajax::doRequest()` Pipeline

```
1. Validate module/command not null
2. Security: reject if class_exists(ucfirst($module)) already [pre-loaded]
3. Security: reject module names containing '.'
4. Resolve class file path:
   - framework → libraries/BMO/Framework.class.php
   - search    → libraries/BMO/Search.class.php
   - {module}  → modules/{module}/{Ucmod}.class.php
5. injectClass() — force load module class
6. ajaxRequest($command, $settings) — must return true
7. Merge $settings into default auth config
8. Referrer check (if CHECKREFERER enabled and allowremote !== true)
9. session_write_close() (unless changesession)
10. Authentication check (unless localhost or authenticate=false)
11. ajaxHandler() — execute and return data
12. JSON encode response with headers
```

---

## Module Authorization

```php
public function ajaxRequest($command, &$setting)
{
	switch ($command) {
		case 'getJSON':
			return true;
		case 'save':
			$setting['authenticate'] = true;
			return true;
		default:
			return false;
	}
}
```

Returning `false` → HTTP 403 `'ajaxRequest declined'`.

---

## Settings Array

Passed by reference to `ajaxRequest`:

| Key | Default | Effect |
|-----|---------|--------|
| `authenticate` | `true` | Require `$_SESSION['AMP_user']` |
| `allowremote` | `false` | Bypass HTTP_REFERER check |
| `changesession` | `false` | Keep session writable during handler |

Localhost (`127.0.0.1`, `::1`) auto-disables authentication.

---

## Handler Implementation

```php
public function ajaxHandler()
{
	switch ($_REQUEST['command']) {
		case 'getJSON':
			switch ($_REQUEST['jdata']) {
				case 'grid':
					return $this->getList();
				default:
					return false;
			}
		default:
			return false;
	}
}
```

### Return Value Handling

| Return Type | JSON Output |
|-------------|-------------|
| `array` | Encoded directly |
| `string` | `{"status": true, "message": "{string}"}` |
| `bool` | `{"status": {bool}, "message": "unknown"}` |
| `false` | Triggers fatal error response |

---

## Security Layers

| Check | Condition | Error |
|-------|-----------|-------|
| Module name regex | `^[\w-]{3,99}$` | HTTP 501 |
| Pre-loaded class | `class_exists(ucfirst($module))` | Exception |
| Path injection | `.` in module name | Exception |
| Command auth | `ajaxRequest` returns false | HTTP 403 |
| Referrer | `CHECKREFERER` + no `HTTP_REFERER` | HTTP 403 |
| Host mismatch | Referrer host ≠ `HTTP_HOST` | HTTP 403 |
| Auth | No `$_SESSION['AMP_user']` | HTTP 401 |

---

## Custom Handler Override

```php
public function ajaxCustomHandler()
{
	// Handle non-standard request patterns
	// Return true to exit without calling ajaxHandler
	return false;
}
```

---

## Bootstrap Table Integration

View (`views/grid.php`):

```php
$dataurl = "ajax.php?module=helloworld&command=getJSON&jdata=grid";
```

```html
<table id="mygrid"
	data-url="<?php echo $dataurl?>"
	data-cache="false"
	data-toggle="table"
	data-pagination="true"
	data-search="true"
	class="table table-striped">
```

JavaScript (`assets/js/helloworld.js`) may define formatters for grid columns.

---

## Framework AJAX Endpoints

| Module | Class | Purpose |
|--------|-------|---------|
| `framework` | `Framework.class.php` | Core framework AJAX |
| `search` | `Search.class.php` | Global search |

---

## Error Response Format

Whoops `JsonResponseHandler` in AJAX context. `Ajax::ajaxError()`:

```php
// HTTP 401, 403, 501, etc.
{"error": true, "message": "Not Authenticated"}
```

---

## `modgettext` Domain

```php
modgettext::textdomain($module);
```

Sets translation domain to requesting module for `_()` calls in handler.

---

## Constraints

- Only BMO modules supported; legacy modules cannot use `ajax.php`
- Module class MUST NOT be loaded before `doRequest()` call
- Session locked during handler unless `changesession = true`
- CSRF token validation not yet implemented (TODO in source)
- AJAX bootstrap skips all `functions.inc.php` loading (`$restrict_mods = true`)
- Command parameter defaults to `"unset"` if missing
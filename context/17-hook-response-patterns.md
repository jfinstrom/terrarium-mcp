# Hook Response Processing Patterns

## Scope

Handling return values from `Hooks::processHooks()` and `processHooksByClassMethod()`. Provider-side patterns for validating, merging, and acting on multi-module hook responses.

**Source:** `jfinstrom/freepbx-dev-docs/Core Concepts/general-module-hooks.md`, `Hooks.class.php`

---

## Return Shape

`processHooks()` takes **no named parameter**. Arguments passed to the call are forwarded to handlers via `func_get_args()`. Hook discovery uses `debug_backtrace()` at level 2 to match the calling class/method.

```php
// Inside Destinations::identifyDestinations($dest):
$responses = $this->FreePBX->Hooks()->processHooks($dest);
// $dest forwarded to each hook handler; backtrace identifies caller
```

```php
[
	"ModuleHandlerA" => ["status" => "ok", "notes" => ["one"]],
	"ModuleHandlerB" => ["status" => "error", "error" => "invalid config"],
	"ModuleHandlerC" => null,
	"ModuleHandlerD" => "simple-string",
]
```

| Key | Value |
|-----|-------|
| Key | Hooking module name (CamelCase) |
| Value | Whatever the handler returned — array, string, scalar, or null |

---

## Core Principles

- Treat all hook returns as **untrusted input**
- Validate types and required keys before use
- Document merge semantics in hook contract
- Log errors with module name for debugging
- Keep handlers fast; defer heavy work to background jobs

---

## Pattern 1: Aggregate Successes and Errors

```php
function processHookResponses_Aggregate(array $responses)
{
	$agg = ['successes' => [], 'errors' => [], 'raw' => $responses];

	foreach ($responses as $module => $result) {
		if ($result === null) {
			$agg['errors'][$module] = 'no response';
			continue;
		}
		if (is_array($result) && isset($result['error'])) {
			$agg['errors'][$module] = $result['error'];
			continue;
		}
		if (!is_array($result) && !is_string($result) && !is_numeric($result)) {
			$agg['errors'][$module] = 'unexpected return type: ' . gettype($result);
			continue;
		}
		$agg['successes'][$module] = $result;
	}

	return $agg;
}
```

---

## Pattern 2: Last-Writer-Wins Merge

Later modules overwrite earlier field values:

```php
function processHookResponses_LastWriterWins(array $responses, array $base)
{
	$final = $base;
	foreach ($responses as $module => $result) {
		if (!is_array($result)) {
			continue;
		}
		foreach ($result as $k => $v) {
			$final[$k] = $v;
		}
	}
	return $final;
}
```

---

## Pattern 3: First-Writer-Wins Merge

Earlier modules take precedence:

```php
function processHookResponses_FirstWriterWins(array $responses, array $base)
{
	$final = $base;
	foreach ($responses as $module => $result) {
		if (!is_array($result)) {
			continue;
		}
		foreach ($result as $k => $v) {
			if (!array_key_exists($k, $final)) {
				$final[$k] = $v;
			}
		}
	}
	return $final;
}
```

---

## Pattern 4: Accumulator (List Concatenation)

```php
function processHookResponses_Accumulate(array $responses)
{
	$items = [];
	foreach ($responses as $module => $result) {
		if (!is_array($result)) {
			continue;
		}
		if (isset($result['items']) && is_array($result['items'])) {
			$items = array_merge($items, $result['items']);
		}
	}
	return $items;
}
```

---

## Pattern 5: Veto / Short-Circuit

Only when hook contract explicitly allows abort:

```php
function processHookResponses_CheckVeto(array $responses)
{
	foreach ($responses as $module => $result) {
		if (is_array($result) && !empty($result['veto'])) {
			return [
				'status' => 'aborted',
				'by'     => $module,
				'reason' => $result['veto'],
			];
		}
	}
	return ['status' => 'ok'];
}
```

---

## Pattern 6: Single Module Lookup

```php
$single = FreePBX::Hooks()->processHooksByModule('ModuleHandlerA', $payload);

if ($single === null) {
	// no response or not implemented
}
if (is_array($single) && isset($single['error'])) {
	// handle error
}
```

---

## Provider Integration Example

```php
public function doSomething($args)
{
	$payload = ['context' => 'doSomething', 'input' => $args];
	$responses = $this->FreePBX->Hooks()->processHooks($payload);

	$agg = processHookResponses_Aggregate($responses);
	if (!empty($agg['errors'])) {
		foreach ($agg['errors'] as $mod => $err) {
			freepbx_log(FPBX_LOG_WARNING, "Hook error from $mod: $err");
		}
	}

	$final = processHookResponses_LastWriterWins($responses, ['result' => 'base']);

	$veto = processHookResponses_CheckVeto($responses);
	if ($veto['status'] === 'aborted') {
		return $veto;
	}

	return [
		'result'       => $final,
		'extensions'   => $agg['successes'],
		'hook_summary' => ['errors' => $agg['errors'], 'raw' => $responses],
	];
}
```

---

## Framework Usage: Destinations

```php
// Destinations::getModuleCheckDestinations()
$data = $this->FreePBX->Hooks()->processHooks($destination);
foreach ($data as $rawname => $module_usage) {
	if (!empty($module_usage)) {
		$dest_usage[$rawname] = $module_usage;
	}
}
// Falls back to legacy {mod}_check_destinations() if hooks empty
```

Hook returns merged with legacy procedural function results.

---

## Error Handling

```php
try {
	$responses = FreePBX::Hooks()->processHooks($payload);
} catch (\Exception $e) {
	freepbx_log(FPBX_LOG_ERROR, 'Hook dispatch failed: ' . $e->getMessage());
	$responses = [];
}
```

`processHooksByClassMethod` throws on:
- Missing hook class
- Missing handler method
- Multiple responses from same module

---

## Hook Contract Documentation

Every hook provider must document:

| Field | Description |
|-------|-------------|
| Payload shape | Keys and types sent to handlers |
| Allowed return types | array, string, null, etc. |
| Merge semantics | last-writer, first-writer, accumulate |
| Veto support | Whether `veto` key aborts operation |
| Priority behavior | How `module.xml` priority affects order |

Include example payload and expected return in `module.xml` comments or module README.

---

## Testing Checklist

- Vary `module.xml` hook priorities to confirm ordering
- Test null, string, numeric, and malformed array returns
- Confirm merge strategy with two modules returning conflicting keys
- Verify `updateBMOHooks()` called after `module.xml` hook changes
- Test with hooking module disabled — should not appear in response array

---

## Constraints

- `processHooks()` uses backtrace level 2 to identify calling context — do not wrap in closures that break backtrace
- One response per module per `processHooksByClassMethod` call
- Null response = handler ran but returned nothing — treat as error or no-op per contract
- Cache must be current: stale hooks cause missing or wrong module responses
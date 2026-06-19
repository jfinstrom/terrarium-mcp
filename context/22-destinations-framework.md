# Destinations Framework Integration

## Scope

Registering module entities as call routing targets. Consumed by IVR, queues, time conditions, ring groups, etc. Accessed via `FreePBX\Destinations` class.

---

## Destination String Format

Opaque string identifiers routing to module-specific handlers:

```
{modulename},{id}           // e.g., helloworld,1
{modulename},{type},{id}    // module-specific formats
```

Stored in `destination` fields across many module tables. Framework resolves via `{mod}_getdestinfo()` or hooks.

---

## Registration Methods

### Hook-First (Modern)

```php
// Hooks registered against Destinations class methods via module.xml:
// callingMethod: getModuleDestinations, getModuleCheckDestinations, etc.
```

`Destinations` calls `Hooks::processHooksByModule()` before legacy fallback.

### Legacy Procedural (Still Active)

| Function | Purpose |
|----------|---------|
| `{mod}_destinations($index)` | Return available destinations array |
| `{mod}_check_destinations($dest)` | Report usage of destination(s) |
| `{mod}_getdestinfo($dest)` | Resolve destination to display info |
| `{mod}_destination_popovers()` | Popover creation UI metadata |
| `{mod}_change_destination($old, $new)` | Bulk destination migration |

---

## `{mod}_destinations()` Return Format

```php
function helloworld_destinations($index = '')
{
	return [
		[
			'destination' => 'helloworld,1',
			'description' => 'Hello World: Main',
			'category'    => 'Hello World',
			'edit_url'    => 'config.php?display=helloworld&view=form&id=1',
		],
	];
}
```

| Key | Required | Purpose |
|-----|----------|---------|
| `destination` | Yes | Routing string |
| `description` | Yes | Dropdown label |
| `category` | Recommended | Grouping in UI |
| `edit_url` | Recommended | Link to edit entity |

---

## BMO Integration Pattern

Implement destination hooks via `module.xml`:

```xml
<hooks>
	<destinations namespace="FreePBX" class="Destinations">
		<method callingMethod="getModuleDestinations">myDestinations</method>
		<method callingMethod="getModuleCheckDestinations">myCheckDestinations</method>
		<method callingMethod="getModuleDestinationInfo">myGetDestInfo</method>
	</destinations>
</hooks>
```

Handler methods on your BMO class:

```php
public function myDestinations($index = '')
{
	return [
		[
			'destination' => 'mymodule,s,1',
			'description' => _('My Module Entry'),
			'category'    => _('My Module'),
			'edit_url'    => 'config.php?display=mymodule',
		],
	];
}

public function myCheckDestinations($destination)
{
	// $destination = true (all) or array of dest strings
	$usage = [];
	// scan DB for references to destinations
	return $usage;
}

public function myGetDestInfo($destination)
{
	// Return info array for a single destination string
}
```

---

## `Destinations` Class API

```php
$dest = FreePBX::Destinations();

// All destinations across all modules
$all = $dest->getAll($index = '');

// Single module
$modDest = $dest->getDestinationsByModule('mymodule', $index);

// Check if destinations are in use
$usage = $dest->getAllInUseDestinations(true);
$matches = $dest->getAllInUseDestinations(['mymodule,s,1']);

// Identify owner of a destination string
$info = $dest->identifyDestinations('mymodule,s,1');
$single = $dest->getDestination('mymodule,s,1');

// Problem detection (empty, orphaned, custom)
$problems = $dest->listProblemDestinations();

// Extension map (used in JS validation)
$extmap = FreePBX::Extensions()->getExtmap();
```

---

## Resolution Flow (`getModuleDestinations`)

```
1. Hooks::processHooksByModule($module, $index)
2. If empty → Modules::loadFunctionsInc($module)
3. If function_exists('{mod}_destinations') → call it
4. Return false if neither available
```

Same cascade for `getModuleCheckDestinations`, `getModuleDestinationInfo`, `getModuleDestinationPopovers`.

---

## Check Destinations Return Format

```php
[
	[
		'dest'        => 'mymodule,s,1',
		'description' => 'IVR: Main Menu → My Module',
		'edit_url'    => 'config.php?display=ivr&extdisplay=1',
	],
]
```

Used to warn before deleting entities that are referenced elsewhere.

---

## `getdestinfo` Return Format

```php
[
	'description' => 'My Module: Entry Point',
	'edit_url'    => 'config.php?display=mymodule',
]
```

---

## Popover Destinations

Quick-create UI embedded in destination picker:

```php
function mymodule_destination_popovers()
{
	return [
		'newitem' => _('Create New Item'),
	];
}
```

Rendered as inline creation forms in destination dropdown.

---

## Hook-Based Identification

```php
// Destinations::identifyDestinations()
$data = $this->FreePBX->Hooks()->processHooks($dest);
// Then falls back to {mod}_getdestinfo() per module
```

---

## GUI Destination Dropdown

Modules reference destinations in forms:

```html
<!-- Framework generates via GUI helpers / destination select components -->
```

Destination select populated by `Destinations::getAll()` filtered by context.

---

## Migration: Change Destination

```php
FreePBX::Destinations()->changeModuleDestination($old_dest, $new_dest);
```

Calls `{mod}_change_destination()` or hook equivalent across all modules.

---

## Constraints

- Destination strings are opaque — do not parse other modules' format
- Always provide `edit_url` for usability in usage warnings
- `check_destinations` called before delete operations — implement to prevent orphans
- Register via hooks (modern) or `functions.inc.php` (legacy) — hooks tried first
- `$index` parameter supports multiple destination sets on one page (e.g., DR outbound routes)
- Feature codes with `providedest=1` auto-appear as destinations
- Destination cache (`$dest_cache`) in Destinations class — per-request only
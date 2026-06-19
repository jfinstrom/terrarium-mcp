# Action Bar and Right Navigation

## Scope

Bottom action buttons (`getActionBar`) and right sidebar navigation (`getRightNav`) rendered via `config.php` footer assembly.

---

## Footer Integration

```php
// config.php (footer assembly)
$bmomodule_name = $bmo->Modules->cleanModuleName($module_name);

if ($bmo->Modules->moduleHasMethod($bmomodule_name, "getActionBar")) {
	$ab = $bmo->$bmomodule_name->getActionBar($_REQUEST);
	// uksort: submit, duplicate, reset, delete
	$footer['action_bar'] = is_array($ab) ? $ab : [];
}

if ($bmo->Modules->moduleHasMethod($bmomodule_name, "getRightNav")) {
	$footer['nav_bar'] = $bmo->$bmomodule_name->getRightNav($_REQUEST);
}

echo load_view($amp_conf['VIEW_FOOTER'], $footer);
```

Methods detected via `Modules::moduleHasMethod()` — no error if absent.

---

## `getActionBar($request)`

Returns associative array of button definitions keyed by button name.

```php
public function getActionBar($request)
{
	if ('helloworld' == $request['display']) {
		if (!isset($_GET['view'])) {
			return [];
		}
		$buttons = [
			'delete' => [
				'name'  => 'delete',
				'id'    => 'delete',
				'value' => _('Delete'),
			],
			'reset' => [
				'name'  => 'reset',
				'id'    => 'reset',
				'value' => _('Reset'),
			],
			'submit' => [
				'name'  => 'submit',
				'id'    => 'submit',
				'value' => _('Submit'),
			],
		];
		if (!isset($_GET['id']) || empty($_GET['id'])) {
			unset($buttons['delete']);
		}
		return $buttons;
	}
}
```

### Button Array Structure

| Key | Type | Purpose |
|-----|------|---------|
| `name` | string | Input name attribute |
| `id` | string | DOM id |
| `value` | string | Button label (use `_()` for i18n) |

### Standard Button Keys

| Key | Typical Use |
|-----|-------------|
| `submit` | Save form |
| `reset` | Reset form fields |
| `delete` | Delete current record |
| `duplicate` | Clone record |

### Sort Order (FREEPBX-10611)

Framework sorts buttons: `submit` → `duplicate` → `reset` → `delete` → others (priority 999).

### Conditional Display Rules

| Condition | Action |
|-----------|--------|
| List view (no `view` param) | Return `[]` — no action bar |
| Add form (no `id`) | Omit `delete` button |
| Wrong `display` | Return nothing (implicit null) |

---

## Gist Stub Pattern

```php
public function getActionBar($request)
{
	$buttons = [];
	switch ($_GET['display']) {
		case 'modulename':
			$buttons = [
				'delete' => ['name' => 'delete', 'id' => 'delete', 'value' => _('Delete')],
				'reset'  => ['name' => 'reset',  'id' => 'reset',  'value' => _('Reset')],
				'submit' => ['name' => 'submit', 'id' => 'submit', 'value' => _('Submit')],
			];
			if (empty($_GET['extdisplay'])) {
				unset($buttons['delete']);
			}
			break;
	}
	return $buttons;
}
```

Gate on `extdisplay` vs `id` depending on module's identifier parameter.

---

## `getRightNav($request)`

Returns HTML string for right sidebar. Injected into `$footer['nav_bar']`.

```php
public function getRightNav($request)
{
	return load_view(__DIR__ . '/views/bootnav.php');
}
```

### bootnav.php Example

```php
<a href="?display=helloworld" class="list-group-item">
	<i class="fa fa-list"></i>&nbsp;<?php echo _("List Notes")?>
</a>
<a href="?display=helloworld&view=form" class="list-group-item">
	<i class="fa fa-plus"></i>&nbsp;<?php echo _("Add Note")?>
</a>
```

Alternatively return raw HTML:

```php
public function getRightNav($request)
{
	$html = '<a href="?display=mymodule&view=settings" class="list-group-item">Settings</a>';
	return $html;
}
```

### Embedded in default.php Layout

helloworld renders bootnav inside the page layout (`col-sm-3 bootnav`), not exclusively via `getRightNav()`. Both patterns exist:

| Pattern | Mechanism |
|---------|-----------|
| Inline in `default.php` | `load_view(__DIR__.'/bootnav.php')` in layout |
| Footer `nav_bar` | `getRightNav()` → `VIEW_FOOTER` |

Use `getRightNav()` when sidebar should appear in framework footer region.

---

## Form Integration

Action bar buttons interact with `fpbx-submit` forms:

```html
<form class="fpbx-submit" id="hwform" name="hwform"
	data-fpbx-delete="config.php?display=helloworld&action=delete&id=<?php echo $id?>">
```

- `submit` button triggers form POST
- `delete` uses `data-fpbx-delete` URL
- `reset` clears form fields client-side

---

## Error Handling

```php
try {
	$ab = $bmo->$bmomodule_name->getActionBar($_REQUEST);
} catch (Exception $e) {
	// Silently caught — TODO: log
}
```

Exceptions in `getActionBar`/`getRightNav` do not crash page; action bar omitted.

---

## Constraints

- Must return `array` from `getActionBar` (empty array `[]` to suppress)
- Non-array return coerced to `[]`
- Gate on `$request['display']` matching your menuitem key
- Use `$_GET` or `$request` consistently for view/id checks
- Button `value` strings must be translated with `_()`
- `getRightNav` return inserted raw into footer — ensure XSS-safe output
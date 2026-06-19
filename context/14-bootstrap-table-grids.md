# Bootstrap Table Grid Patterns

## Scope

AJAX-powered data tables using Bootstrap Table plugin. Reference: `helloworld` module grid + `FreePBX-gists/bs-grid.php`.

---

## Architecture

```
views/grid.php          ← table HTML with data-url
assets/js/{module}.js   ← column formatters
ajax.php                ← JSON data endpoint
Modulename::ajaxHandler ← returns row array
```

---

## Grid View (`views/grid.php`)

```php
<table id="hwgrid"
	data-url="ajax.php?module=helloworld&command=getJSON&jdata=grid"
	data-cache="false"
	data-height="299"
	data-toggle="table"
	class="table table-striped">
	<thead>
		<tr>
			<th data-field="id" data-formatter="linkFormat" class="col-md-1">
				<?php echo _("Action")?>
			</th>
			<th data-field="subject" class="col-md-11">
				<?php echo _("Subject")?>
			</th>
		</tr>
	</thead>
</table>
```

### Key `data-*` Attributes

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `data-url` | AJAX endpoint URL | Data source |
| `data-toggle` | `table` | Enable Bootstrap Table |
| `data-cache` | `false` | Disable client cache |
| `data-height` | pixels | Fixed table height |
| `data-pagination` | `true` | Enable paging |
| `data-search` | `true` | Enable search box |
| `data-toolbar` | `#toolbar-id` | Toolbar element selector |
| `data-show-columns` | `true` | Column visibility toggle |
| `data-maintain-selected` | `true` | Keep selections on page change |

### Column Definition

| Attribute | Purpose |
|-----------|---------|
| `data-field` | JSON key from AJAX response |
| `data-formatter` | JavaScript formatter function name |
| `data-formatter` | Global JS function in module's `.js` file |

---

## AJAX Data Endpoint

### Authorization

```php
public function ajaxRequest($command, &$setting)
{
	if ("getJSON" == $command) {
		return true;
	}
	return false;
}
```

### Handler

```php
public function ajaxHandler()
{
	if ('getJSON' == $_REQUEST['command'] && 'grid' == $_REQUEST['jdata']) {
		return $this->getList();
	}
	return ['status' => false, 'message' => _("Invalid Request")];
}
```

### Data Provider

```php
public function getList()
{
	$sql = 'SELECT id, subject FROM helloworld';
	$data = $this->Database->query($sql)->fetchAll(\PDO::FETCH_KEY_PAIR);
	array_walk($data, function (&$value, $key) {
		$value = ['id' => $key, 'subject' => $value];
	});
	return array_values($data);
}
```

### Expected JSON Response

Bootstrap Table expects array of objects matching `data-field` keys:

```json
[
	{"id": 1, "subject": "First note"},
	{"id": 2, "subject": "Second note"}
]
```

---

## JavaScript Formatter (`assets/js/helloworld.js`)

```javascript
function linkFormat(value) {
	var html = `<a href="?display=helloworld&view=form&id=${value}"><i class="fa fa-edit"></i></a>&nbsp;`;
	html += `<a class="delAction" href="?display=helloworld&action=delete&id=${value}"><i class="fa fa-trash"></i></a>`;
	return html;
}
```

- Formatter functions are **global** — defined in module JS file loaded by asset pipeline
- `value` = cell value for the `data-field` column
- Return HTML string rendered in cell

---

## Extended Grid with Toolbar (Gist Pattern)

```php
$dataurl = "ajax.php?module=mymodule&command=getJSON&jdata=grid";
?>
<div id="toolbar-all">
	<button id="remove-all" class="btn btn-danger btn-remove"
		data-type="mymodule" disabled data-section="all">
		<i class="glyphicon glyphicon-remove"></i>
		<span><?php echo _('Delete')?></span>
	</button>
</div>
<table id="mygrid"
	data-url="<?php echo $dataurl?>"
	data-cache="false"
	data-toolbar="#toolbar-all"
	data-maintain-selected="true"
	data-show-columns="true"
	data-show-toggle="true"
	data-toggle="table"
	data-pagination="true"
	data-search="true"
	class="table table-striped">
	<thead>
		<tr>
			<th data-field="name"><?php echo _("Items")?></th>
			<th data-field="link" data-formatter="linkFormatter"><?php echo _("Actions")?></th>
		</tr>
	</thead>
</table>
```

---

## AJAX Handler Multi-Branch Pattern (Gist Stub)

```php
public function ajaxHandler()
{
	switch ($_REQUEST['command']) {
		case 'getJSON':
			switch ($_GET['jdata']) {
				case 'grid':
					$ret = [];
					/* populate $ret array */
					return $ret;
				default:
					return false;
			}
		default:
			return false;
	}
}
```

---

## Page Integration

Grid shown when `showPage()` has no `view=form`:

```php
public function showPage()
{
	$subhead = _('Item List');
	$content = load_view(__DIR__ . '/views/grid.php');

	if ('form' == $_REQUEST['view']) {
		$subhead = _('Add Item');
		$content = load_view(__DIR__ . '/views/form.php');
	}

	echo load_view(__DIR__ . '/views/default.php', [
		'subhead' => $subhead,
		'content' => $content,
	]);
}
```

Action bar returns `[]` on list view (no form buttons needed).

---

## Asset Loading

Module JS auto-included on page render via `framework_include_js()`:

```
assets/{rawname}/js/{rawname}.js
```

Formatter functions must be in this file (or page-specific JS subdir).

---

## Delete Action Pattern

Two approaches:

| Approach | Mechanism |
|----------|-----------|
| Direct link | `<a href="?display=mod&action=delete&id=N">` processed in `doConfigPageInit` |
| Form delete | `data-fpbx-delete` on `fpbx-submit` form |

Grid formatters typically use direct link with `delAction` class for JS confirmation.

---

## Constraints

- `data-url` path is relative to `/admin/` (ajax.php location)
- AJAX module name must match rawname exactly
- `jdata` parameter is convention, not framework-enforced — handle in `ajaxHandler`
- Formatter function names must be unique globally across loaded JS files
- Return `false` from `ajaxHandler` triggers fatal AJAX error
- Grid on list view: suppress `getActionBar` buttons via empty array
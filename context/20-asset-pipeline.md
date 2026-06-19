# Asset Pipeline — JS, CSS, LESS

## Scope

Module static asset discovery and inclusion on GUI page render. Assets linked on page load; symlinks created on Apply Config.

**Source:** `libraries/view.functions.php` — `framework_include_css()`, `framework_include_js()`

---

## Directory Structure

```
{rawname}/
└── assets/
    ├── js/
    │   ├── {rawname}.js           ← auto-loaded
    │   └── {page_name}/           ← page-specific JS
    │       └── custom.js
    ├── css/
    │   ├── {rawname}.css
    │   └── {page_name}/
    │       └── custom.css
    ├── less/
    │   └── {Rawname}.less         ← compiled on demand
    ├── images/
    └── fonts/
```

Wiki convention: `{modulename}.less` loaded first if it exists.

---

## Public URL Paths

Assets symlinked to web-accessible path on Apply Config:

```
/admin/assets/{rawname}/js/{file}.js
/admin/assets/{rawname}/css/{file}.css
/admin/assets/{rawname}/less/{compiled}.css
```

---

## CSS Inclusion (`framework_include_css`)

Called from `config.php` when `$module_name` is set:

```php
$fw_gui_html .= framework_include_css();
```

### Discovery Order

1. **Deprecated root:** `modules/{rawname}/{rawname}.css`
2. **Deprecated page:** `modules/{rawname}/{page}.css`
3. **Assets dir:** `modules/{rawname}/assets/css/*.css` (alphabetical)
4. **Page subdir:** `modules/{rawname}/assets/css/{page}/*.css`
5. **LESS compiled:** `FreePBX::Less->generateModuleStyles($module_name, $module_page)`

### Output

```html
<link href="assets/helloworld/css/helloworld.css" rel="stylesheet" type="text/css" />
<link href="assets/helloworld/less/helloworld.css" rel="stylesheet" type="text/css" />
```

### Cache Busting

```php
$mod_version_tag = '&load_version=' . urlencode($module_version);
if ($amp_conf['FORCE_JS_CSS_IMG_DOWNLOAD']) {
	$mod_version_tag .= '.' . time();
}
```

---

## JS Inclusion (`framework_include_js`)

```php
framework_include_js($module_name, $module_page);
```

### Discovery Order

1. **Deprecated root:** `modules/{rawname}/{rawname}.js` via `?handler=file`
2. **Deprecated page:** `modules/{rawname}/{page}.js` via `?handler=file`
3. **Assets dir:** `modules/{rawname}/assets/js/*.js`
4. **Page subdir:** `modules/{rawname}/assets/js/{page}/*.js`

### Output

```html
<script type="text/javascript"
	src="assets/helloworld/js/helloworld.js?load_version=15.0.1"></script>
```

Module-level JS loaded before page-specific JS (dependency order).

---

## LESS Compilation

```php
$files = FreePBX::create()->Less->generateModuleStyles($module_name, $module_page);
if (!empty($files)) {
	$html .= '<link href="assets/' . $module_name . '/less/' . $files[0] . '" rel="stylesheet" type="text/css" />';
}
```

- Source: `assets/less/{Modulename}.less`
- Compiled output served from `assets/{rawname}/less/`
- Main framework LESS compiled via `FreePBX::Less->generateMainStyles()` for header

---

## Deprecated File Handler

Legacy root-level assets served via query handler:

```html
<link href="?handler=file&module=modulename&file=modulename.css&load_version=1.0" />
<script src="?handler=file&module=modulename&file=modulename.js&load_version=1.0"></script>
```

**Do not use in new modules.** Place files in `assets/` subdirectories.

---

## Apply Config / Symlink Creation

Asset symlinks regenerated during `fwconsole reload` / Apply Config. New files in `assets/` become web-accessible after reload.

Without Apply Config, new asset files may 404 until next reload.

---

## Module JS Example (helloworld)

```javascript
// assets/js/helloworld.js
function linkFormat(value) {
	var html = `<a href="?display=helloworld&view=form&id=${value}"><i class="fa fa-edit"></i></a>&nbsp;`;
	html += `<a class="delAction" href="?display=helloworld&action=delete&id=${value}"><i class="fa fa-trash"></i></a>`;
	return html;
}
```

Global functions referenced by Bootstrap Table `data-formatter="linkFormat"`.

---

## Images and Fonts

```
assets/images/   → referenced as assets/{rawname}/images/{file}
assets/fonts/    → referenced as assets/{rawname}/fonts/{file}
```

No automatic discovery — reference explicitly in CSS/LESS/JS.

---

## i18n Directory

```
{rawname}/i18n/
```

Separate from asset pipeline — handled by `modgettext` for translations.

---

## Constraints

- Assets not auto-loaded in AJAX context — only full GUI page renders
- JS/CSS filenames discovered by extension (`.js`, `.css`) — other extensions ignored
- Global JS function names must not collide across modules
- LESS requires Apply Config or manual compilation trigger
- `FORCE_JS_CSS_IMG_DOWNLOAD` advanced setting busts browser cache aggressively
- Page-specific subdirs match `$module_page` (display name), not rawname
- Do not put PHP in `assets/` — served as static files only
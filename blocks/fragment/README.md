# Fragment Block

## Overview

The Fragment block includes another document on the current page. `decorate()` reads one path from the block (a link `href`, or the cell text) and calls `loadFragment()`. Other blocks import `loadFragment()` for header, footer, account sidebar, enrichment, and auto-blocks.

See [AEM fragment block](https://www.aem.live/developer/block-collection/fragment).

Account pages that author `/customer/nav` do not fetch that document. `loadFragment()` replaces it with an empty `commerce-account-sidebar` block. That block then loads `/customer/sidebar-fragment`. Menu authoring for that list is in [commerce-account-sidebar/README.md](../commerce-account-sidebar/README.md).

## Integration

### Block Configuration

| Configuration Key | Type | Default | Description | Required |
| --- | --- | --- | --- | --- |
| Fragment URL | path or URL | none | Path of the document to include. One cell. | Yes |

`readBlockConfig()` is not used. The path comes from `a[href]` or the trimmed text of the block.

### Authoring table

| fragment | |
| --- | --- |
| /customer/nav | |

A full URL is accepted. Only the pathname is used. The path must start with `/` and must not start with `//`.

### `loadFragment(path)`

| Path | What happens |
| --- | --- |
| `/customer/nav` (or a URL whose pathname is that path) | Does not fetch `/customer/nav`. Builds a `commerce-account-sidebar` main, runs `decorateMain` and `loadSections`, and returns it. The sidebar block fetches `/customer/sidebar-fragment`. |
| `/customer/sidebar-fragment` | Fetches `{root}/customer/sidebar-fragment.plain.html` with `cache: 'no-store'`. Decorates and loads sections. |
| Any other `/path` | Fetches `{root}{path}.plain.html`. Rewrites `./media_` image and source URLs to the fragment path. Decorates and loads sections. |
| Missing, not a path, or a failed fetch | Returns `null`. The fragment block keeps its authored cell. Callers that check the result (sidebar) clear their content. |

Callers:

| Caller | Path |
| --- | --- |
| Fragment block | Authored cell |
| `commerce-account-sidebar` | Always `/customer/sidebar-fragment` |
| Header | `nav` metadata, or `/nav` |
| Footer | `footer` metadata, or `/footer`; store switcher `/store-switcher` |
| Enrichment, targeted-block, `buildAutoBlocks` | Authored `/fragments/` links |

## Add the fragment

1. Create and publish the source document (for the account menu, `/customer/sidebar-fragment`).
2. On the host page, insert a Fragment block with one cell: the path.

Account pages that already include `/customer/nav` need no new fragment row. That path becomes the sidebar block in `fragment.js`.

| File | Role |
| --- | --- |
| `blocks/fragment/fragment.js` | `loadFragment()` and `decorate()` |
| `blocks/fragment/_fragment.json` | Document Authoring fields `fragmentUrl` and `fragmentUrlText` |
| `/customer/sidebar-fragment` | Authored account menu list |
| `blocks/commerce-account-sidebar/commerce-account-sidebar.js` | Renders that list |

## Remove the fragment

Remove the Fragment block from the host page. Other pages that still call `loadFragment()` are unchanged.

Do not delete `blocks/fragment/fragment.js`. Header, footer, sidebar, enrichment, and auto-blocks import it.

Empty or unpublish `/customer/sidebar-fragment` and the account sidebar has no items. That does not remove `/nav` or `/footer`.

## Behavior Patterns

### Page Context Detection

- **Account nav**: `/customer/nav` is rewritten to `commerce-account-sidebar`
- **Account menu list**: `/customer/sidebar-fragment` is fetched without HTTP cache
- **Site chrome**: `/nav`, `/footer`, and `/store-switcher` load as normal fragments
- **Auto-blocks**: Links whose href contains `/fragments/` and are not already inside a fragment block are replaced with the loaded document

### User Interaction Flows

1. **Block**: Read the path, load the fragment, replace the block children with the fragment sections
2. **Account nav**: Inject the sidebar block, which loads and paints `/customer/sidebar-fragment`
3. **Media**: Relative `./media_` assets resolve against the fragment pathname

### Error Handling

- **Bad path**: `loadFragment()` returns `null`
- **Fetch not ok**: Returns `null`
- **Account nav**: No network call for `/customer/nav`. A missing `/customer/sidebar-fragment` leaves the sidebar empty

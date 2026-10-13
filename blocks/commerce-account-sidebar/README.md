# Commerce Account Sidebar Block

## Overview

The Commerce Account Sidebar block builds the customer account menu from a Document Authoring fragment. It is not a catalog picker. The live list is `/customer/sidebar-fragment`. Each list item becomes a link with an icon, title, subtitle, and chevron. The item that matches the current URL is marked active.

## Fragment

`loadFragment()` lives in [fragment.js](../fragment/fragment.js). How every path is loaded is in [fragment/README.md](../fragment/README.md).

The block always loads `/customer/sidebar-fragment`. Edit that document in Document Authoring. Preview and publish it. The storefront reads `.plain.html` with `cache: 'no-store'` so a republish shows on the next page load.

Account pages usually insert a **Fragment** block that points at `/customer/nav`. That path does not contain the menu. `loadFragment()` in `blocks/fragment/fragment.js` treats `/customer/nav` as this sidebar block, which then fetches `/customer/sidebar-fragment`.

| How the page is authored | What the shopper gets |
| --- | --- |
| Fragment `/customer/nav` | This sidebar, filled from `/customer/sidebar-fragment` |
| `commerce-account-sidebar` on the page | Same sidebar, same fragment |
| Fragment `/customer/sidebar-fragment` | The raw list from that document (no sidebar styling) |

Do not put the menu items on `/customer/nav`. That document is only the fragment path many account pages already author. Add, reorder, or remove items on `/customer/sidebar-fragment`.

### Add the fragment

Create `/customer/sidebar-fragment` as a numbered list. Each top-level item is one menu row. Nest a second list with subtitle, path, and icon name.

```
1. My Account
   1. Account details
   2. /customer/account
   3. User
2. Orders
   1. Track, manage and return
   2. /customer/orders
   3. Order
3. Newsletter Subscription
   1. Newsletter Subscription
   2. /customer/newsletter
   3. Placeholder
```

| Nested cell | Used as | If missing |
| --- | --- | --- |
| Title (the top-level line) | Menu heading | `Default Title` |
| First nested item | Subtitle | Empty |
| Second nested item | Link. An `<a href>` or a path such as `/customer/newsletter` | `#` |
| Third nested item | Drop-in `Icon` source (`User`, `Order`, `AddressBook`) | `Placeholder` |

On an account page, insert either:

| fragment | |
| --- | --- |
| /customer/nav | |

or an empty `commerce-account-sidebar` table. Both load `/customer/sidebar-fragment`.

The fragment block is one cell: the path. Full URLs are accepted; only the pathname is used.

| File | Role |
| --- | --- |
| `/customer/sidebar-fragment` | Authored menu. Publish after every change. |
| `blocks/fragment/fragment.js` | Loads `.plain.html`. Rewrites `/customer/nav` to this block. |
| `blocks/commerce-account-sidebar/commerce-account-sidebar.js` | Reads the first `ol` and renders the links. |

### Remove the fragment

Delete or empty `/customer/sidebar-fragment` and the sidebar has no items. Remove the Fragment or `commerce-account-sidebar` block from an account page to hide the menu on that page only. Other account pages that still include `/customer/nav` or this block keep the sidebar.

Do not delete `blocks/fragment/fragment.js`. Footer and other pages use `loadFragment()` for their own paths.

## Integration

### Block Configuration

No block configuration is read via `readBlockConfig()`. The menu comes from the fragment list.

### URL Parameters

No URL parameters are read. The current page URL is compared with each item link to set the active item.

## Behavior Patterns

### Page Context Detection

- **Orders page**: The orders item (`CUSTOMER_ORDERS_PATH`) is active when the URL contains that path
- **Other account pages**: The item whose link is in the current URL is active
- **Fragment loading**: `/customer/sidebar-fragment` is the DA list. Pages that author `/customer/nav` render this same block so preview, publish, and the storefront share that document

### User Interaction Flows

1. **Initialization**: The block loads the fragment, reads the first `ol` (including after section wrappers), and replaces its children with menu links
2. **Menu item creation**: Each item gets icon, title, subtitle, and chevron
3. **Active state**: The current URL is compared with each item path
4. **Navigation**: A click follows the configured link

### Error Handling

- **Fragment loading errors**: Failed or missing fragment leaves the block empty
- **Missing list**: No `ol` means no items
- **Missing cells**: Title falls back to `Default Title`, link to `#`, icon to `Placeholder`
- **Icon errors**: The icon container is still created

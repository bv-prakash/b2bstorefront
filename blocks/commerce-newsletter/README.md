# Commerce Newsletter Block

## Overview

The Commerce Newsletter block mounts `@prakash.gurung/commerce-newsletter` `NewsletterContainer` (1.2.0). One block, three views. **Minified view** chooses the view. Leave that row out, or set it to Form, for the public email signup.

| View | Minified view | Who | What the shopper sees |
| --- | --- | --- | --- |
| Form | omitted or empty | Anyone | Title, description, email field, Subscribe |
| Minified true | `true` | Signed-in customer | Subscription status and **Edit** |
| Minified false | `false` | Signed-in customer | **General Subscription** checkbox and **SAVE** |

Edit on the minified view opens **Newsletter page**. This storefront uses `/customer/newsletter`. Leave the cell empty to use that path. Set it only when the checkbox page lives somewhere else.

## Integration

### Block Configuration

| Configuration Key | Type | Default | Description | Required | Side Effects |
|-------------------|------|---------|-------------|----------|--------------|
| `minified-view` | string | empty (form) | `true` = summary. `false` = checkbox page. Empty or Form = public email form | No | Minified views require a signed-in customer and redirect guests to login |
| `newsletter-page` | string | `/customer/newsletter` | Path the **Edit** link opens | No | Used only when `minified-view` is `true` |
| `title` | string | Subscribe to our newsletter | Heading on the public form | No | Replaces the drop-in heading |
| `description` | string | Be the first to hear about new products, offers, and stories. | Text under the heading on the public form | No | Replaces the drop-in description |
| `placeholder` | string | Enter your email address | Hint inside the email field | No | Replaces the email field hint |

### Authoring tables

Public form (footer or marketing). Leave **Minified view** out.

| commerce-newsletter | |
| --- | --- |
| title | Subscribe to our newsletter |
| description | Be the first to hear about new products, offers, and stories. |
| placeholder | Enter your email address |

Account summary. **Edit** opens `/customer/newsletter` unless **Newsletter page** is set.

| commerce-newsletter | |
| --- | --- |
| Minified view | true |

Newsletter page. Checkbox subscribe / unsubscribe. Nothing saves until SAVE. SAVE uses the drop-in `updateCustomerV2` mutation.

| commerce-newsletter | |
| --- | --- |
| Minified view | false |

### Events

#### Event Emitters

- `newsletter/subscribed` — public form after a successful subscribe, `{ email, status }`
- `newsletter/updated` — checkbox page after SAVE, `{ subscribed }`

## Behavior Patterns

### Page Context Detection

- **Form**: Anyone. Calls `subscribeEmailToNewsletter`.
- **Minified true / false**: Signed-in only. Guests go to the login page. Loads `customer.is_subscribed`. False view saves with `updateCustomerV2`.

### User Interaction Flows

1. **Form**: Shopper enters an email and chooses Subscribe. Invalid addresses stay on the page. `SUBSCRIBED` or `UNCONFIRMED` shows the success text and clears the field.
2. **Minified true**: Drop-in loads the customer subscription. Subscribed customers see the subscribed label. **Edit** opens **Newsletter page**.
3. **Minified false**: Drop-in checks **General Subscription** when the customer is already subscribed. SAVE sends `{ input: { is_subscribed } }`. The button shows Saving, then Subscription saved.

### Error Handling

- **Validation Errors**: An invalid email is rejected before the request is sent
- **API Errors**: The container shows the API message, or the drop-in error copy
- **Authentication Errors**: Minified views redirect guests to login
- **Configuration Errors**: Missing title, description, or placeholder values fall back to the drop-in defaults. Missing **Newsletter page** uses `/customer/newsletter`

Labels live in the newsletter placeholder sheet (`placeholders/newsletter.json`). Do not add those rows to `placeholders/global`. Keys you leave out keep the drop-in defaults.

# Commerce Newsletter Block

## Overview

The Commerce Newsletter block provides email signup using the `@prakash.gurung/commerce-newsletter` NewsletterContainer. A shopper enters an email address and chooses Subscribe. The block calls the `subscribeEmailToNewsletter` GraphQL mutation through the storefront GraphQL client.

## Integration

### Block Configuration

| Configuration Key | Type | Default | Description | Required | Side Effects |
|-------------------|------|---------|-------------|----------|--------------|
| `title` | string | Subscribe to our newsletter | Heading above the form | No | Replaces the drop-in heading |
| `description` | string | Be the first to hear about new products, offers, and stories. | Text under the heading | No | Replaces the drop-in description |
| `placeholder` | string | Enter your email address | Hint inside the email field | No | Replaces the email field hint |

<!-- ### URL Parameters

No URL parameters directly affect this block's behavior. -->

<!-- ### Local Storage

No localStorage keys are used by this block. -->

### Events

#### Event Emitters

- `newsletter/subscribed` — emitted by the drop-in after a successful subscribe, with `{ email, status }`

## Behavior Patterns

### User Interaction Flows

1. **Initialization**: The block initializes the newsletter drop-in and shares the storefront GraphQL client, including store and auth headers
2. **Form Display**: Renders the email field and Subscribe button. Empty configuration fields keep the drop-in defaults
3. **Validation**: An empty or invalid address shows **Enter a valid email address.**
4. **Subscribe**: A valid address is sent with `subscribeEmailToNewsletter`
5. **Success**: Status `SUBSCRIBED` or `UNCONFIRMED` shows **Thanks for subscribing.** and clears the field
6. **Failure**: Any other result shows the API message, or **We couldn't subscribe you. Please try again.**

### Error Handling

- **Validation Errors**: An invalid email is rejected before the request is sent
- **API Errors**: The NewsletterContainer shows the API message, or the default error copy
- **Configuration Errors**: Missing title, description, or placeholder values fall back to the drop-in defaults

# D-025 · No contacts matching in v1
| Status | Approved (default: suggested answer accepted 2026-09-25) | Date | 2026-09-25 |
|---|---|---|---|

## Decision
`/contacts-match`, `profiles.phone_hash`, `profiles.discoverable`, `trip_members.contact_hash` and the `discoverable`/`contacts_matching` consent kinds are **removed from v1**. "Add from contacts" copies **names only**, and no phone number or hash is stored.

## Why
The feature needs phone login, which is later. A phone-number hash with a published salt can be reversed in seconds (review S-04). It's the most privacy risk for the least value in the beta.

## Impact
[03](../03-database-schema.md), [04 §8](../04-api-schema.md), [features/members-and-ghosts](../features/members-and-ghosts.md), [features/account-and-privacy](../features/account-and-privacy.md).

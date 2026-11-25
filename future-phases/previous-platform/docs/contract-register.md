# Target API contract register

No endpoint is claimed to exist in Laravel. OpenAPI0.11.0 defines109 executable operations across99 paths. All141 original dependencies remain, with30 explicit detail/workflow/user-extension dependencies (171 total). Cards/activity additions are target drafts; remaining targets remain drafts.

| Page | Method | Target endpoint | Contract status |
|---|---|---|---|
|O01|GET|`/ops/v1/overview`|executable OpenAPI 0.9.0|
|O02|GET|`/ops/v1/customers`|executable OpenAPI 0.6.0|
|O02|GET|`/ops/v1/customers/{id}`|executable OpenAPI 0.6.0|
|O03|GET|`/ops/v1/onboarding`|executable OpenAPI 0.6.0|
|O03|POST|`/ops/v1/onboarding/{id}/review-requests`|target draft — refine in D2|
|O04|GET|`/ops/v1/accounts`|executable D2a target — OpenAPI 0.3.0|
|O04|GET|`/ops/v1/accounts/{id}`|executable D2a target — OpenAPI 0.3.0|
|O05|GET|`/ops/v1/operations`|executable D2a target — OpenAPI 0.3.0|
|O05|GET|`/ops/v1/operations/{id}`|executable D2a target — OpenAPI 0.3.0|
|O06|GET|`/ops/v1/collections`|executable OpenAPI 0.5.0|
|O06|GET|`/ops/v1/collections/{id}`|executable OpenAPI 0.5.0|
|O07|GET|`/ops/v1/payouts`|executable OpenAPI 0.5.0|
|O07|GET|`/ops/v1/payouts/{id}`|executable OpenAPI 0.5.0|
|O08|GET|`/ops/v1/holds`|executable D2b read target — OpenAPI 0.4.0|
|O08|GET|`/ops/v1/holds/{id}`|executable D2b read target — OpenAPI 0.4.0|
|O09|GET|`/ops/v1/journals`|executable D2b read target — OpenAPI 0.4.0|
|O09|GET|`/ops/v1/journals/{id}`|executable D2b read target — OpenAPI 0.4.0|
|O10|GET|`/ops/v1/reconciliation/runs`|executable OpenAPI 0.7.0|
|O10|GET|`/ops/v1/reconciliation/runs/{id}`|executable OpenAPI 0.7.0|
|O11|GET|`/ops/v1/reconciliation/exceptions`|target draft — refine in D5|
|O11|POST|`/ops/v1/cases`|target draft — refine in D5|
|O12|GET|`/ops/v1/cases`|target draft — refine in D5|
|O12|POST|`/ops/v1/cases/{id}/decisions`|target draft — refine in D5|
|O13|GET|`/ops/v1/adjustment-templates`|target draft — refine in D5|
|O13|POST|`/ops/v1/adjustments/preview`|target draft — refine in D5|
|O13|POST|`/ops/v1/cases`|target draft — refine in D5|
|O14|GET|`/ops/v1/disputes`|target draft — refine in D5|
|O14|POST|`/ops/v1/disputes/{id}/responses`|target draft — refine in D5|
|O15|GET|`/ops/v1/partners`|target draft — refine in D5|
|O15|GET|`/ops/v1/partners/{id}`|target draft — refine in D5|
|O15|POST|`/ops/v1/cases`|target draft — refine in D5|
|O16|GET|`/ops/v1/products`|target draft — refine in D5|
|O16|GET|`/ops/v1/policies`|target draft — refine in D5|
|O16|POST|`/ops/v1/cases`|target draft — refine in D5|
|O17|GET|`/ops/v1/reports`|executable OpenAPI 0.7.0|
|O17|POST|`/ops/v1/exports`|executable OpenAPI 0.7.0|
|O17|GET|`/ops/v1/daily-close`|executable OpenAPI 0.7.0|
|O18|GET|`/ops/v1/audit-events`|executable OpenAPI 0.8.0|
|O18|GET|`/ops/v1/audit-verifications`|executable OpenAPI 0.8.0|
|O19|GET|`/ops/v1/staff`|executable OpenAPI 0.8.0|
|O19|GET|`/ops/v1/role-matrix`|executable OpenAPI 0.8.0|
|O19|POST|`/ops/v1/cases`|target draft — governed actions D5|
|O20|GET|`/ops/v1/integrations`|executable OpenAPI 0.8.0|
|O20|GET|`/ops/v1/integrations/{id}`|executable OpenAPI 0.8.0|
|O21|GET|`/ops/v1/alerts`|executable OpenAPI 0.8.0|
|O21|POST|`/ops/v1/alerts/{id}/acknowledgements`|executable OpenAPI 0.8.0|
|O22|GET|`/ops/v1/governance`|executable OpenAPI 0.8.0|
|O22|GET|`/ops/v1/settings`|executable OpenAPI 0.8.0|
|O22|PATCH|`/ops/v1/me/preferences`|executable OpenAPI 0.8.0|
|C01|POST|`/v1/registrations`|executable OpenAPI 0.10.0|
|C01|POST|`/v1/registrations/{id}/verify`|executable OpenAPI 0.10.0|
|C02|POST|`/v1/sessions`|target draft — refine in D3|
|C02|POST|`/v1/recovery-requests`|executable OpenAPI 0.11.0|
|C03|GET|`/v1/me/verification`|executable OpenAPI 0.10.0|
|C03|POST|`/v1/me/verification/submissions`|executable OpenAPI 0.10.0|
|C04|GET|`/v1/products/eligible`|executable OpenAPI 0.10.0|
|C04|POST|`/v1/accounts`|executable OpenAPI 0.10.0|
|C05|GET|`/v1/me`|executable OpenAPI 0.11.0|
|C05|GET|`/v1/me/overview`|executable OpenAPI 0.10.0|
|C06|GET|`/v1/accounts`|executable OpenAPI 0.10.0|
|C06|GET|`/v1/accounts/{id}`|executable OpenAPI 0.10.0|
|C06|POST|`/v1/accounts/{id}/closure-requests`|executable OpenAPI 0.11.0|
|C07|GET|`/v1/operations`|target draft — refine in D4|
|C07|GET|`/v1/operations/{id}`|target draft — refine in D4|
|C08|POST|`/v1/transfers/internal/preview`|target draft — refine in D4|
|C08|POST|`/v1/transfers/internal`|target draft — refine in D4|
|C09|GET|`/v1/beneficiaries`|target draft — refine in D4|
|C09|POST|`/v1/beneficiaries`|target draft — refine in D4|
|C09|PATCH|`/v1/beneficiaries/{id}`|target draft — refine in D4|
|C10|POST|`/v1/collections/preview`|target draft — refine in D4|
|C10|POST|`/v1/collections`|target draft — refine in D4|
|C11|POST|`/v1/payouts/preview`|target draft — refine in D4|
|C11|POST|`/v1/payouts`|target draft — refine in D4|
|C12|GET|`/v1/accounts/{id}/statements`|target draft — refine in D3|
|C12|POST|`/v1/exports`|target draft — refine in D3|
|C13|GET|`/v1/me`|executable OpenAPI 0.11.0|
|C13|PATCH|`/v1/me/preferences`|target draft — refine in D3|
|C13|POST|`/v1/me/profile-change-requests`|target draft — refine in D3|
|C14|GET|`/v1/me/sessions`|target draft — refine in D3|
|C14|DELETE|`/v1/me/sessions/{id}`|target draft — refine in D3|
|C14|POST|`/v1/me/mfa/enrollments`|target draft — refine in D3|
|C15|GET|`/v1/me/notifications`|target draft — refine in D3|
|C15|PATCH|`/v1/me/notifications/{id}`|target draft — refine in D3|
|C16|GET|`/v1/me/support-tickets`|target draft — refine in D3|
|C16|POST|`/v1/disputes`|target draft — refine in D3|
|C16|POST|`/v1/me/support-tickets`|target draft — refine in D3|
|C17|GET|`/v1/businesses/{id}/members`|target draft — refine in D9|
|C17|POST|`/v1/businesses/{id}/invitations`|target draft — refine in D9|
|C18|GET|`/v1/businesses/{id}/payment-cases`|target draft — refine in D9|
|C18|POST|`/v1/businesses/{id}/payment-cases`|target draft — refine in D9|
|P01|POST|`/partner/v1/registrations`|target draft — refine in D6|
|P01|POST|`/partner/v1/registrations/{id}/verify`|target draft — refine in D6|
|P02|POST|`/partner/v1/sessions`|target draft — refine in D6|
|P02|POST|`/partner/v1/recovery-requests`|target draft — refine in D6|
|P03|POST|`/partner/v1/organizations`|target draft — refine in D6|
|P03|PATCH|`/partner/v1/organizations/{id}`|target draft — refine in D6|
|P04|GET|`/partner/v1/organizations/{id}/verification`|target draft — refine in D6|
|P04|POST|`/partner/v1/organizations/{id}/verification/submissions`|target draft — refine in D6|
|P05|GET|`/partner/v1/organizations/{id}/onboarding`|target draft — refine in D6|
|P06|GET|`/partner/v1/overview`|target draft — refine in D7|
|P07|GET|`/partner/v1/applications`|target draft — refine in D7|
|P07|POST|`/partner/v1/applications`|target draft — refine in D7|
|P07|PATCH|`/partner/v1/applications/{id}`|target draft — refine in D7|
|P08|GET|`/partner/v1/credentials`|target draft — refine in D7|
|P08|POST|`/partner/v1/credentials`|target draft — refine in D7|
|P08|POST|`/partner/v1/credentials/{id}/rotations`|target draft — refine in D7|
|P08|DELETE|`/partner/v1/credentials/{id}`|target draft — refine in D7|
|P09|GET|`/developers/openapi/{version}`|target draft — refine in D6|
|P09|GET|`/developers/changelog`|target draft — refine in D6|
|P11|POST|`/partner/v1/sandbox/runs`|target draft — refine in D7|
|P11|GET|`/partner/v1/sandbox/runs/{id}`|target draft — refine in D7|
|P12|GET|`/partner/v1/webhook-endpoints`|target draft — refine in D7|
|P12|POST|`/partner/v1/webhook-endpoints`|target draft — refine in D7|
|P12|PATCH|`/partner/v1/webhook-endpoints/{id}`|target draft — refine in D7|
|P13|GET|`/partner/v1/webhook-deliveries`|target draft — refine in D7|
|P13|POST|`/partner/v1/webhook-deliveries/{id}/replays`|target draft — refine in D7|
|P14|GET|`/partner/v1/request-logs`|target draft — refine in D7|
|P14|GET|`/partner/v1/request-logs/{id}`|target draft — refine in D7|
|P15|GET|`/partner/v1/usage`|target draft — refine in D7|
|P15|GET|`/partner/v1/quotas`|target draft — refine in D7|
|P15|POST|`/partner/v1/quota-change-requests`|target draft — refine in D7|
|P16|GET|`/partner/v1/customers`|target draft — refine in D8|
|P16|GET|`/partner/v1/accounts`|target draft — refine in D8|
|P16|POST|`/partner/v1/customer-onboarding-requests`|target draft — refine in D8|
|P17|GET|`/partner/v1/operations`|target draft — refine in D8|
|P17|GET|`/partner/v1/operations/{id}`|target draft — refine in D8|
|P18|GET|`/partner/v1/reports`|target draft — refine in D8|
|P18|POST|`/partner/v1/discrepancies`|target draft — refine in D8|
|P19|GET|`/partner/v1/members`|target draft — refine in D7|
|P19|POST|`/partner/v1/invitations`|target draft — refine in D7|
|P19|PATCH|`/partner/v1/members/{id}`|target draft — refine in D7|
|P20|GET|`/partner/v1/commercial-terms`|target draft — refine in D8|
|P20|GET|`/partner/v1/invoices`|target draft — refine in D8|
|P21|POST|`/partner/v1/production-access-requests`|target draft — refine in D8|
|P21|GET|`/partner/v1/production-access-requests/{id}`|target draft — refine in D8|
|P22|GET|`/partner/v1/support-tickets`|target draft — refine in D8|
|P22|POST|`/partner/v1/support-tickets`|target draft — refine in D8|
|P22|GET|`/partner/v1/service-status`|target draft — refine in D8|
|P23|GET|`/partner/v1/security`|target draft — refine in D7|
|P23|GET|`/partner/v1/audit-events`|target draft — refine in D7|
|P23|DELETE|`/partner/v1/sessions/{id}`|target draft — refine in D7|
|O18|GET|`/ops/v1/audit-events/{id}`|executable OpenAPI 0.8.0|
|O18|POST|`/ops/v1/audit-verifications`|executable OpenAPI 0.8.0|
|O18|GET|`/ops/v1/audit-verifications/{id}`|executable OpenAPI 0.8.0|
|O18|POST|`/ops/v1/exports`|executable OpenAPI 0.8.0|
|O18|GET|`/ops/v1/exports/{id}`|executable OpenAPI 0.8.0|
|O18|GET|`/ops/v1/exports/{id}/download`|executable OpenAPI 0.8.0|
|O19|GET|`/ops/v1/staff/{id}`|executable OpenAPI 0.8.0|
|O21|GET|`/ops/v1/alerts/{id}`|executable OpenAPI 0.8.0|
|O01|GET|`/ops/v1/outbox`|executable OpenAPI 0.9.0|
|O01|GET|`/ops/v1/outbox/{id}`|executable OpenAPI 0.9.0|
|C01|GET|`/v1/registration-policy`|executable OpenAPI 0.10.0|
|C01|GET|`/v1/registrations/current`|executable OpenAPI 0.10.0|
|C01|POST|`/v1/registrations/{id}/challenges`|executable OpenAPI 0.10.0|
|C03|PATCH|`/v1/me/verification`|executable OpenAPI 0.10.0|
|C03|POST|`/v1/me/verification/evidence`|executable OpenAPI 0.10.0|
|C02|GET|`/v1/recovery-requests/current`|executable OpenAPI 0.11.0|
|C02|GET|`/v1/recovery-requests/{id}`|executable OpenAPI 0.11.0|
|C02|POST|`/v1/recovery-requests/{id}/challenges`|executable OpenAPI 0.11.0|
|C02|POST|`/v1/recovery-requests/{id}/verifications`|executable OpenAPI 0.11.0|
|C02|POST|`/v1/recovery-requests/{id}/completions`|executable OpenAPI 0.11.0|
|C06|GET|`/v1/accounts/{id}/closure-eligibility`|executable OpenAPI 0.11.0|
|C06|GET|`/v1/accounts/{id}/closure-requests`|executable OpenAPI 0.11.0|
|C06|GET|`/v1/closure-requests/{id}`|executable OpenAPI 0.11.0|
|C06|POST|`/v1/step-up/challenges`|executable OpenAPI 0.11.0|
|C06|POST|`/v1/step-up/challenges/{id}/verifications`|executable OpenAPI 0.11.0|
|C05|GET|`/v1/accounts/{id}/cards`|draft — user-requested cards extension; D4 card slice|
|C06|GET|`/v1/accounts/{id}/cards`|draft — user-requested cards extension; D4 card slice|
|C06|GET|`/v1/cards/{id}`|draft — user-requested cards extension; D4 card slice|
|C06|POST|`/v1/accounts/{id}/card-requests`|draft — user-requested cards extension; D4 card slice|
|C05|GET|`/v1/operations`|draft — D4 source shared with C07|

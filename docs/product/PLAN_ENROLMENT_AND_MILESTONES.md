# Plan: Settings, Enrolment vs Commitment, Milestone Periods and Range Submissions

Repo: `LeonLuAble/campaign`, branch `main` (read through the GitHub tools only, nothing cloned, nothing modified).
Status: **proposal for approval**, no prompts sent. All defaults from the user's "use your defaults" answer are applied.
Convention: additive migrations only, never edit merged migrations, new timestamps must be greater than the latest merged one (`1793066214000`).

---

## 1. What exists today (grounded)

| Area | Today | Where |
|---|---|---|
| Campaign config | Free JSON `campaign_configurations.settings` (`rulesStrategy`, `submissionReview`). Editable in draft only; after publish only `description` and extending `endsOn` (`CAMPAIGN_FIELD_LOCKED`). Target communities are also locked after publish, so the audience is fixed at publish. | `apps/api/src/modules/campaigns/application/campaign.service.ts`, `campaign-settings.ts`, `campaign-lifecycle.ts` |
| Participation | One row per (campaign, user). Status `enrolled \| withdrawn`. Self-enrol or admin-enrol. Withdraw then re-enrol restores the same row. Eligibility via `enrollmentCommunityId()` (tenant-level memberships always match). | `modules/participation/*`, `campaign-visibility.ts` |
| Commitment | **Exactly one per participation** (`uq_commitments_participation_id`, `target_value`/`unit` NOT NULL). `POST /participations/:id/commitments` is create-or-replace. Allowed while published or started. Vegetarian choices and the "whole campaign duration" target (已全素) come from the strategy. | `modules/commitments/*`, migration `1792465709000`, `modules/vegetarian/application/vegetarian-rules.ts` |
| Actions and submissions | One `actions` row per (participation, definition, day) (partial unique index while `recorded`), `quantity` int > 0, idempotency key, `occurred_on` campaign-TZ date, no future dates, inside the campaign window. One `submissions` row per action (`submitted/approved/rejected`); auto mode creates `approved`. Cancel is idempotent. Only `POST /submissions/:id/approve\|reject` exists. **No list-submissions or review-queue endpoint.** | `modules/actions/*` |
| Milestones | Campaign-scoped **aggregate thresholds** (`metric`, `threshold_value`, `unit`, all NOT NULL). **No date.** Editable at any time. `evaluate` is an admin action, appends history, notifies on first crossing. | `modules/milestones/*`, migration `1792565810000` |
| Progress | Computed on read. `computeCampaignSnapshots` loads **all** participations (withdrawn too), maps **one** commitment per participation, target from `rules.resolveProgressTarget(commitment, {startsOn, endsOn})`. Counts approved submissions on non-cancelled actions. | `modules/progress/application/progress.service.ts`, `progress-math.ts` |
| Outcomes, dashboards, TREE, reports | Computed from per-day approved actions with the impact factor effective on `occurredOn`. | `modules/outcomes`, `visualizations`, `reports` |
| Reminders | Daily, skip if an approved action exists today. | `modules/notifications/application/reminder-eligibility.ts` |
| Errors | `ResourceConflictException(message, code)` supports custom codes; `InvalidRequestException` is always `BAD_REQUEST`. Error body has no `details` field. Mobile maps join errors by message substring. | `shared/errors/domain-http.exceptions.ts`, `mobile/lib/campaigns/campaign_helpers.dart` |
| Mobile prefs | Locale is held **in memory only** (`_override` in `CampaignApp`), never persisted. `/welcome` shows on every signed-out launch. Language selector is duplicated on Welcome, Me and `/preferences`. `PreferencesPage` already holds timezone and reminders. No `shared_preferences` dependency. Server side: `PATCH /me {locale,timezone}` and `GET/PUT /me/notification-preferences` already exist. | `apps/mobile/lib/app.dart`, `auth/welcome_page.dart`, `me/me_page.dart`, `preferences/preferences_page.dart`, `routing/app_router.dart` |
| Mobile join | `JoinFlowPage` does join **and** commitment in one submit. Check-in is day-by-day with a stable idempotency key per (day, definition). | `campaigns/join_flow_page.dart`, `check_in_page.dart` |
| Admin | Wizard has 6 steps (Basics, Schedule, Rules, Audience, Actions, Review); sends `configuration: {rulesStrategy, submissionReview}`. Workspace tab "Milestones and impact" is a **"coming soon" placeholder** above the impact-factor list. Participants page is a raw list of `userId` + status. | `apps/admin/lib/campaigns/campaign_wizard_page.dart`, `campaign_workspace_page.dart`, `participants_page.dart` |
| Clients | `packages/api_client` has **no milestone methods** and no enriched participants or submissions list. `packages/api-contracts/src/index.ts` carries request/response interfaces. | `packages/api_client/lib/src/{campaign_api,models,fake_campaign_api}.dart` |

Consequences for this plan:
- Milestones exist but are not dates, so we **extend** them (not a parallel concept).
- The one-commitment-per-participation constraint must be relaxed for per-period commitments.
- The UX plan's C3/C4/C5 (enriched participants, review queue, milestone UI) are **not built on main**. Range review needs a queue, so a minimal version is folded into phase P5/A3 below.

---

## 2. Data model and migrations

### 2.1 Concepts and statuses

- **Enrolment** (belongs to the participation row): the member is in the campaign. `participations.status` stays `enrolled | withdrawn`. New column `enrolment_source` = `self | auto | admin` (default `self`, existing rows `self`).
- **Enrolment mode** (campaign setting, no column): `configuration.enrolmentMode = 'opt_in' | 'auto'`, default `opt_in` (current behaviour). Validated in `CampaignService`. Locked after publish like all configuration.
- **Decision** (belongs to a commitment row): `committed | not_taking_part`. "Not taking part" is a real, unpenalised row, changeable while the campaign is published or started and the period is not closed.
- **Derived participation state** (API only, never stored): `awaiting_commitment | taking_part | not_taking_part | withdrawn`, computed for the current period (or the whole campaign when there are no dated milestones).

### 2.2 Migration M-E: enrolment (additive)
`1793166314000-AddEnrolmentSourceAndCommitmentDecision`
- `participations.enrolment_source` enum (`self|auto|admin`) NOT NULL DEFAULT `self`.
- `commitments.decision` enum (`committed|not_taking_part`) NOT NULL DEFAULT `committed`.
- `commitments.target_value` and `commitments.unit` DROP NOT NULL, plus `CHECK (decision = 'not_taking_part' OR (target_value > 0 AND char_length(trim(unit)) > 0))`. Existing checks already pass on NULL.

### 2.3 Migration M-P1: dated milestones (additive, constraint relaxation)
`1793266415000-AddMilestoneDueDate`
- `milestones.due_on date NULL`.
- `metric`, `threshold_value`, `unit` DROP NOT NULL, with `CHECK ((metric IS NULL AND threshold_value IS NULL AND unit IS NULL) OR (metric IS NOT NULL AND threshold_value IS NOT NULL AND unit IS NOT NULL))`. A dated milestone may omit the collective goal. Existing rows are untouched and keep working (`due_on` NULL = goal-only milestone).
- `CREATE UNIQUE INDEX uq_milestones_campaign_due_on ON milestones (campaign_id, due_on) WHERE due_on IS NOT NULL AND is_active`.
- `evaluate` and the first-crossing notification are skipped when no goal is set.

### 2.4 Periods (computed, not stored)
Active milestones with `due_on`, sorted ascending, split the campaign window `[startsOn, endsOn]`.
- Period *i* = `[previous due_on + 1 day (or startsOn), due_on]`. The last period always ends on `endsOn`; if no milestone sits on `endsOn`, an implicit final period (key = `endsOn`, `milestoneId = null`) is added.
- No dated milestones means **one implicit period = the whole campaign** (today's behaviour, fully backward compatible).
- Period key = its end date `YYYY-MM-DD`. Dated milestones are validated: inside the window, unique, and **immutable after publish** (see 3.4).

### 2.5 Migration M-P2: per-period commitments (additive plus one constraint drop)
`1793366516000-AddCommitmentPeriods`
- `commitments.valid_from date NULL`, `valid_to date NULL`, `period_milestone_id uuid NULL` (FK `milestones`, RESTRICT).
- **DROP CONSTRAINT `uq_commitments_participation_id`** (this relaxes a constraint; it deletes no data, but it touches an existing constraint, so it is flagged for approval in section 8).
- Add `UNIQUE (participation_id) WHERE valid_to IS NULL` (legacy and no-milestone campaigns) and `UNIQUE (participation_id, valid_to) WHERE valid_to IS NOT NULL`.
- Existing rows: `decision='committed'`, `valid_*` NULL = whole campaign. Nothing to backfill.
- The `enforce_commitment_same_tenant` trigger is unchanged.
- `valid_from` = the date the member first selected (campaign-TZ today, clamped to the period start; or the period start when choosing ahead). `valid_to` = period end.

### 2.6 Migration M-P3: range submissions (additive)
`1793466617000-CreateActionBatches`
- New table `action_batches` (`id, tenant_id, campaign_id, participation_id, action_definition_id, start_on, end_on, day_count, quantity_per_day, payload jsonb, idempotency_key, created_by_user_id, created_at`), indexes on tenant, campaign, participation. Same-tenant trigger like `enforce_action_same_tenant`. Unique `(participation_id, idempotency_key)` where not null.
- `actions.batch_id uuid NULL` (FK, RESTRICT) plus an index.
- **Storage choice:** a range **expands to one `actions` row per day** (quantity = the figure) tied to one batch. That keeps progress, outcomes (factor effective per day), dashboards, time series, TREE, reports, `hasApprovedActionOn` and reminders working with **no change**. The batch is the unit for display, review and cancel. A submission row is created per action as today.
- The existing unique index `uq_actions_recorded_participation_definition_day` is the hard backstop against overlap.
- No new permission keys. Members already have `actions.create`, `commitments.create`, `milestones.read`.

---

## 3. API contract changes

All paths under `/api/v1`. Every API phase also updates `packages/api-contracts`, `packages/api_client` (interface, `HttpCampaignApiClient`, `FakeCampaignApiClient`, models) and adds e2e tests.

### 3.1 Enrolment
- `configuration.enrolmentMode` accepted by `POST /campaigns` and `PUT /campaigns/:id/configuration` (draft only).
- Participation response adds `enrolmentSource`, `engagement` (`awaiting_commitment|taking_part|not_taking_part|withdrawn`).
- `POST /campaigns/:id/participations`: in `auto` mode it is **idempotent self-heal** (returns or creates the caller's own row, never an error). In `opt_in` it is unchanged.
- `POST /participations/:id/withdraw` in an `auto` campaign for the member themself: **409 `ENROLMENT_AUTO_MANAGED`** ("use not taking part"). Admins (`participations.update`) may still withdraw.
- **Auto-enrol mechanism** (`ParticipationService.reconcileAutoEnrolment(campaign)`, idempotent, creates only *missing* rows with `enrolment_source='auto'`, never reactivates or touches existing rows, so a withdrawn or opted-out member is never resurrected):
  1. on **publish** and on **start** (same transaction boundary as the transition, logged);
  2. on **membership created or reactivated**: a small in-process port `MembershipLifecycleListener` (multi-provider token, no new dependency, no event bus) called after commit from `MembershipService.create`, `update(isActive=true)`, the invitation service and user-import confirm;
  3. **self-heal on member reads** (`GET /campaigns`, `GET /campaigns/:id` for the caller) so a missed hook is repaired;
  4. admin `POST /campaigns/:id/auto-enrol/sync` (`participations.create`) returns `{ created, alreadyEnrolled, skipped }`.
  Eligible = active membership that applies to the campaign communities (existing `campaignAppliesToMembership`, including descendants) **and holds the system `member` role** (staff who are only `tenant_admin` are not auto-enrolled; they can still self-join).
- `GET /campaigns/:id/participation-summary` (needs `progress.read`, aggregate only): `{ enrolled, awaitingCommitment, takingPart, notTakingPart, withdrawn }`.

### 3.2 Commitment decision and periods
- `GET /campaigns/:id/periods` (needs `campaigns.read`) returns `[{ key, index, startsOn, endsOn, milestoneId|null, name|null, isFinal, dayCount }]` (computed).
- `GET /participations/:id/periods` (own, or `participations.read`) returns each period with `status` (`upcoming|open|closed`), `decision|null`, `commitment` (typeKey, target, unit, validFrom, validTo), `resultStatus` (`awaiting|submitted|pending_review|not_submitted|not_applicable`), `coveredDays`, `approvedDays`, `achieved`, `target`, `unit`. **`not_submitted` is a display state only** (the period is closed and has no entries); it flips to `submitted` if the member backfills.
- `POST /participations/:id/commitments` body gains `decision?: 'committed'|'not_taking_part'` (default `committed`) and `periodKey?` (default: the period containing today, or the first period if the campaign has not started). Still create-or-replace, now per (participation, period). `not_taking_part` ignores `typeKey/targetValue/unit`. Optional `restOfCampaign: true` writes `not_taking_part` for every remaining open period.
- `GET /campaigns/:id/commitment-options?periodKey=` returns the window (`validFrom`, `validTo`, `dayCount`) and `usesCampaignDuration` targets resolved **for that window**. The strategy call becomes `resolveProgressTarget(commitment, {startsOn: validFrom, endsOn: validTo})`, so no strategy interface change.
- Rules: only on an `enrolled` participation while published or started; period not closed (`due_on` >= today in campaign TZ) else 409 `PERIOD_CLOSED`; unit `days` target > window days, or `meals` target > 3 x days, gives 400 `COMMITMENT_TARGET_EXCEEDS_PERIOD`.

### 3.3 Dated milestones
- Existing `POST/GET/PATCH /campaigns/:id/milestones` gain `dueOn?` (ISO date) and optional `metric/thresholdValue/unit` (all or none), plus optional `translations.en.{name,description}` (same pattern as campaigns: `translations` table, namespace `tenant:{customerId}`, `Accept-Language`). Response adds `dueOn`.
- Validation: `dueOn` within `[startsOn, endsOn]`, unique per campaign (409 `MILESTONE_DATE_DUPLICATE`, 400 `MILESTONE_DATE_OUT_OF_WINDOW`).
- Lock rules: **draft:** full CRUD (remove = `isActive=false`). **Published/started:** `name`, `description`, translations and goal values stay editable; `dueOn` and `isActive` changes, and creating a new dated milestone, return 409 `MILESTONE_LOCKED` (they would re-cut periods under existing commitments).
- Existing `evaluate`, `progress`, `evaluations` endpoints unchanged and ignore milestones without a goal.

### 3.4 Single-day and range submissions
- `POST /actions` (unchanged shape). New in campaigns that have dated milestones: the day must be inside a period where the participation has a `committed` commitment whose `[validFrom, validTo]` covers it, else 409 `NO_COMMITMENT_FOR_DATE`. Campaigns with no dated milestones keep today's behaviour (commitment optional). Duplicate day now returns the stable code `SUBMISSION_OVERLAP` (still 409).
- **`POST /participations/:id/action-ranges`** `{ actionDefinitionId, startOn, days, quantityPerDay, idempotencyKey?, privacyLevel?, payload? }` returns 201 `{ batch, actions[] }`.
  - Meaning: `quantityPerDay` was achieved on each of the `days` days from `startOn` (inclusive).
  - Each day is validated with the **same strategy `validateAction`** (vegetarian: `days` unit means figure 1; `meals` means 1 to 3). `days` is 1 to 92. End date <= today (campaign TZ) and inside the campaign window. The range must lie inside **one period and one commitment window**, else 400 `RANGE_SPANS_PERIODS`.
  - **Overlap:** inside one transaction (row lock on the participation), if any `recorded` action of the same definition exists on any day in the range, reject with 409 `SUBMISSION_OVERLAP` and `details.conflictingDates: string[]`. Nothing is written. The partial unique index is the race backstop. Add an optional `details` object to the error body (additive change to `ApiErrorResponse` and the filter).
  - Review: honours `submissionReview`. Auto means every child submission is `approved`; manual means `submitted`.
  - Idempotent replay of the same `idempotencyKey` and payload returns the original batch.
- `GET /participations/:id/action-batches`, `GET /action-batches/:id` return the batch with `status` derived from child submissions (`submitted|approved|rejected|mixed`).
- `POST /action-batches/:id/cancel`: owner or `actions.update`; cancels every child action (idempotent, rows preserved). A new range or day can then be entered.
- `POST /action-batches/:id/approve|reject {note?}` (`submissions.update`) fans out to child submissions in one transaction. Per-submission approve or reject still works (admin may reject a single day, making the batch `mixed`).
- **Review queue (minimal C3):** `GET /campaigns/:id/submissions?status=&participationId=&cursor=&limit=` returns one row per single action or per batch (grouped), with counts and the member display name for admins only. Bulk review keeps per-row results.

### 3.5 Progress, outcomes, counts
- `computeCampaignSnapshots`: filter to `enrolled` participations only (today withdrawn rows are included; fixed here). For each participation, take all `committed` commitments, compute each against only the approved actions inside its `[valid_from, valid_to]`, then combine: **target = sum of period targets, achieved = sum inside committed windows** (same unit; mixed units stay in `byUnit`). `not_taking_part` periods add **0 target and 0 achieved**: never penalised, never lowers a community percentage. Legacy NULL-window commitments keep whole-campaign behaviour. Implement as a pure `combinePeriodSnapshots()` next to `computeParticipantProgress` so the existing math and tests stay valid.
- Aggregate responses: `participantCount` = enrolled (not withdrawn); `committedParticipantCount` = taking part with at least one commitment; add `notTakingPartCount`, `awaitingCommitmentCount`.
- Outcomes, dashboards, TREE, CSV reports: no logic change (per-day rows). Reports add the new counts (aggregate only, still no rankings or contact data).
- Reminders: skip participations that are `not_taking_part` for today's period or have no committed commitment covering today (in periodised campaigns).
- New notification `period_due_soon` is **not** built now (open question 6).

### 3.6 Settings
No new endpoint. Language syncs via the existing `PATCH /me {locale}`; timezone and reminders via the existing endpoints. Theme, colour and behaviour stay local until they need a server-side preferences JSON (future).

### 3.7 Error codes added (HTTP)
`ENROLMENT_AUTO_MANAGED` (409), `PERIOD_CLOSED` (409), `COMMITMENT_TARGET_EXCEEDS_PERIOD` (400), `NO_COMMITMENT_FOR_DATE` (409), `SUBMISSION_OVERLAP` (409, with `details.conflictingDates`), `RANGE_SPANS_PERIODS` (400), `MILESTONE_DATE_DUPLICATE` (409), `MILESTONE_DATE_OUT_OF_WINDOW` (400), `MILESTONE_LOCKED` (409). `InvalidRequestException` gets an optional code argument (additive) so the 400 codes are stable. Mobile and admin map **codes, not message substrings** (also replaces the substring mapping in `localizeJoinError`).

---

## 4. Admin UI changes (`apps/admin`)

- **Wizard, Audience step:** "How do members join?" radio: *Everyone in the selected communities is enrolled automatically* / *Members choose to join*. Sends `configuration.enrolmentMode`. Helper text explains that members added later are enrolled automatically.
- **Wizard, new step "Milestones" (between Schedule and Rules):** list of milestones (name zh + optional en, date picker restricted to the campaign window, optional collective goal collapsed under "Add a shared goal"). Shows a live **period preview** ("Period 1: 1 Nov to 15 Nov, Period 2: 16 Nov to 30 Nov (campaign end)"). Zero milestones is valid and shows "one period for the whole campaign". Review step lists enrolment mode and periods.
- **Workspace, "Milestones" tab** (replaces the placeholder; impact factors move to an "Impact" tab): table of milestones with date, goal (progress bar from `/milestones/:id/progress` when a goal exists), Evaluate and history (existing C5 scope). Draft: add, edit, remove. Published/started: date and removal disabled with a "Locked after publish" notice; name, description, goal editable. Period preview panel.
- **Workspace, Participants tab** (folds in C4 basics): enriched table (name, community, state chip using icon plus text: Awaiting commitment, Taking part, Not taking part, Withdrawn; **no sorting by completion**), summary strip from `participation-summary`, "Sync auto-enrolment" button for auto campaigns, enrol and withdraw actions.
- **Workspace, Review tab:** queue from the new endpoint; a range shows as one row ("10 Oct to 16 Oct, 7 days, 3 meals per day"); approve or reject the whole batch with a note, or expand to reject a single day.
- l10n: `app_en.arb`, `app_zh_Hans.arb`; map the new error codes.

## 5. Mobile UI changes (`apps/mobile`)

- **Settings:** see S1 below. Me tab shows profile, **Settings**, Notifications, Sign out (language selector removed from Me). The settings screen has sections Language, Notifications (reminders, time), Time zone, and a visible "More options coming soon" placeholder row structure for Theme, Colour and Behaviour.
- **Join, step 1 (enrol):** campaign detail shows "Join" (opt-in) or a "You are enrolled automatically" banner (auto). No commitment is asked in this step.
- **Join, step 2 (commit):** after enrolment (or when enrolled automatically), a "Choose your commitment" card appears on Home, Campaigns and the participation view for the current period: the existing choice cards (from `commitment-options?periodKey`) plus a first-class **"Not taking part this period"** option (and "for the rest of the campaign"). The confirmation step states the exact dates it covers ("From 3 Nov to the milestone on 15 Nov, 13 days"). A not-taking-part member sees a calm "Not taking part, change anytime" state, no red, no nagging.
- **Participation view:** a **period timeline** (one card per period): decision, dates, target, achieved ring, and result status chip (Awaiting, Submitted, Pending review, **Not submitted**, Not taking part). "Not submitted" is neutral grey with an icon plus text, never red; a "Submit your result" button stays available after the date (backfill).
- **Milestone result screen** (per period): list of entries (single days and ranges), "Add a day" (existing one-tap check-in), and **"Add a date range"**.
- **Range entry:** start date picker (clamped to the commitment window, not future), number of days (stepper, clamped to the period end and today), and the figure per day (hidden when the unit is `days`, 1 to 3 stepper for `meals`). A live summary line: "10 to 16 Oct, 7 days x 3 meals = 21 meals". Overlap is pre-checked locally from loaded entries and the server's `SUBMISSION_OVERLAP.conflictingDates` are highlighted; it shows a calm message and no data loss. Disable while sending, idempotency key per (start, days, figure). Entries can be cancelled (batch cancel) and re-entered.
- All strings in en and zh-Hans; section 5.5 accessibility (48dp targets, text scale 2.0, screen-reader labels, reduce motion).

---

## 6. Edge cases and test list

**Enrolment (API e2e):** auto enrol on publish creates rows only for eligible members (descendant communities, tenant-level members with the `member` role; admin-only users skipped); member added **after** publish (invite, import confirm, manual membership, reactivation) is enrolled; sync is idempotent; withdrawn or not-taking-part members are not resurrected; auto self-withdraw gives `ENROLMENT_AUTO_MANAGED`; cross-tenant isolation (404); campaign hidden from non-targeted members still hides; opt-in behaviour unchanged (regression).
**Decision:** awaiting then committed; committed then not_taking_part then committed again; not-taking-part is rejected on a withdrawn participation; `restOfCampaign`; counts and percentages unchanged for the community when a member opts out (assert numerically); reminders skipped.
**Periods:** zero milestones means one period and all legacy tests pass; milestone on `endsOn`; first milestone on `startsOn` (1-day first period); commit on the due date itself covers 1 day; target larger than window gives `COMMITMENT_TARGET_EXCEEDS_PERIOD`; 已全素 target equals the window day count; `PERIOD_CLOSED`; locked milestones after publish; timezone boundaries (today in campaign TZ, not UTC).
**Ranges:** success auto and manual; every strategy rule applied per day (vegetarian meals 4 is rejected); overlap with a single day, with another range, with a cancelled day (allowed); race (two concurrent identical ranges, exactly one wins, the other gets `SUBMISSION_OVERLAP` or an idempotent replay); future end date; outside window; spans two periods; day 93; batch cancel then re-enter; manual-review approve and reject of a whole batch and of a single child (`mixed`); progress recomputes immediately after reject or cancel (totals and outcomes equal the sum of the per-day rows); outcome factor version changing mid-range is applied per day.
**Mobile:** widget tests with `FakeCampaignApiClient` for each screen at en and zh-Hans, text scale 2.0 no overflow; overlap error rendering; double-tap guard; settings persistence across restart (in-memory store plus a real `SharedPreferences.setMockInitialValues` test); welcome shown once, then never; TOKEN_REUSED flow unchanged.
**Admin:** wizard step validation (date out of window, duplicate dates), period preview, locked-state rendering, batch review.

---

## 7. Phased build order (one Cursor prompt per phase, built on `main`)

Each phase ends with `flutter analyze`, `flutter test --exclude-tags golden` (ui_kit, api_client, apps touched) and API `npm run lint && npm test && npm run test:e2e`.

| Id | Scope | Acceptance |
|---|---|---|
| **S1** Settings | Mobile: add `shared_preferences`; `AppPreferences` (ChangeNotifier) behind a `PreferencesStore` interface (memory fake for tests) holding `locale` and `onboardingSeen`; `LocaleScope` becomes a thin view of it (call sites unchanged); router sends first-run signed-out users to `/welcome`, later launches straight to `/login`; Welcome "Continue" sets `onboardingSeen`; compact language toggle on the sign-in page; Settings screen (reuse `/preferences` route, rename title) with Language, Notifications, Time zone, placeholder rows; remove the language control from Me and add a Settings tile; on first sign-in with no local choice adopt `profile.locale`, otherwise keep local and PATCH `/me`. Admin (cheap): persist locale with the same store. | Locale survives restart; Welcome appears exactly once per install; one language control location after onboarding (plus sign-in shortcut); tests pass; no API change. |
| **E1** Enrolment mode and auto-enrol | M-E migration (enrolment source, decision columns); `enrolmentMode` validation; `reconcileAutoEnrolment`; hooks on publish, start, membership create/reactivate, invitation, import confirm; self-heal on member reads; `POST /auto-enrol/sync`; `ENROLMENT_AUTO_MANAGED`; participation `enrolmentSource`/`engagement`; contracts, client, fake. | Section 6 enrolment tests green; opt-in regression green; no hook failure blocks a membership write (errors logged). |
| **E2** Commitment decision and counts | `decision` on commitments (still single period): `not_taking_part`, derived `engagement`, `participation-summary`, aggregate counts (`participantCount` excludes withdrawn), progress ignores not-taking-part, reminders skip; contracts, client, fake. | Opt-out never lowers community percent; counts correct; all legacy commitment tests pass. |
| **P1** Dated milestones | M-P1 migration; milestone `dueOn`, optional goal, translations, validation, lock-after-publish rules; `GET /campaigns/:id/periods`; client milestone methods (list/create/update/progress/evaluate/evaluations) and fake; evaluate ignores goal-less rows. | Periods computed per section 2.4 with unit tests of the pure function; locks enforced; existing milestone e2e unchanged. |
| **P2** Per-period commitments | M-P2 migration; periodKey on create-or-replace; window-aware `commitment-options`; `PERIOD_CLOSED`, `COMMITMENT_TARGET_EXCEEDS_PERIOD`; `GET /participations/:id/periods`; legacy single commitment behaviour preserved when no dated milestones. | One commitment per (participation, period); legacy campaigns unaffected; 已全素 target equals window. |
| **P3** Day coverage and range submissions | M-P3 migration; `NO_COMMITMENT_FOR_DATE`; `SUBMISSION_OVERLAP` with error `details`; `POST /participations/:id/action-ranges`, batch get/list/cancel/approve/reject; strategy validation per day; contracts, client, fake. | Overlap and race tests green; totals equal per-day sums; batch cancel and reject recompute progress. |
| **P4** Period-aware progress | `combinePeriodSnapshots`, enrolled-only snapshots, new aggregate counts, reports and dashboards payloads (aggregate only), reminders period-aware. | Sum-of-periods target and achieved verified; outcomes unchanged; all progress, report and dashboard e2e pass. |
| **P5** Review queue API | `GET /campaigns/:id/submissions` (grouped by batch), cursor pagination, enriched participants list (name, community, engagement; admin-only contact masking rules as in B-API-4), bulk review with per-row results. | Queue never leaks contact data to community-scoped callers; no completion sorting. |
| **A1** Admin wizard | Enrolment radio in Audience; Milestones step with period preview; review summary; l10n. | Wizard creates a campaign with `enrolmentMode` and dated milestones; widget tests incl. date-window validation. |
| **A2** Admin milestones tab | Replace the placeholder: CRUD, lock state, period preview, goal progress, evaluate and history; impact factors to an "Impact" tab. | Locked after publish; evaluate confirm; tests. |
| **A3** Admin participants and review | Enriched participants table with engagement chips and summary, auto-enrol sync button, review queue with batch rows. | Chips use icon plus text; batch approve and reject; no ranking. |
| **N1** Mobile enrol, step 1 | Two-step flow part 1: Join (opt-in) or auto-enrolled banner, no commitment at join; error-code mapping; Campaigns tab sections updated. | Joining never asks for a commitment; auto campaigns show enrolled state. |
| **N2** Mobile commitment per period | Commit card, choice cards per period, "Not taking part" (this period or rest of campaign), dated confirmation, change while open. | Decision persists; neutral not-taking-part state; en and zh text scale 2.0 OK. |
| **N3** Mobile periods and milestone result | Period timeline on participation view, milestone result screen listing entries, "Not submitted" neutral state, backfill, links to check-in. | Statuses match API `resultStatus`; no red, no rankings. |
| **N4** Mobile range entry | Range form (date, days, figure), live summary, overlap handling, cancel and re-enter, idempotency, offline and error states. | Overlap shown calmly with the conflicting dates; double-tap safe; tests incl. text scale 2.0. |

Critical path: S1 (independent, can go first) then E1, E2, P1, P2, P3, P4, P5, A1 to A3, N1 to N4. A1 can start after P1; N1 after E2; N2 after P2; N3 after P4; N4 after P3.

---

## 8. Risks and open questions (defaults proposed)

1. **Approval needed (migration):** M-P2 drops `uq_commitments_participation_id` (replaced by two partial unique indexes) and M-P1/M-E drop NOT NULL on several columns. No data is deleted or rewritten, existing rows stay valid. *Default: proceed once approved.*
2. **Extend existing milestones vs a new concept.** Default: extend `milestones` with `due_on` and an optional goal (reuse CRUD, permissions, evaluate). Fallback if you prefer a clean split: a separate `campaign_checkpoints` table, at the cost of two "milestone" concepts in code and UI.
3. **Who is auto-enrolled.** Default: active members who hold the `member` role in a targeted community (including descendants, tenant-level members). Admin-only accounts are not auto-enrolled. Say if staff should also be enrolled.
4. **Auto campaigns and withdraw.** Default: members cannot withdraw from an auto campaign; they choose "Not taking part" (admins can still withdraw). Otherwise a withdrawn member would be a permanent special case.
5. **Late and backfilled entries.** Default: entries for any past day inside the campaign window stay allowed while the campaign is started (as today); "Not submitted" is only a display state that flips when the member backfills. Say if entries should close at a fixed grace period after each milestone.
6. **Range crossing a milestone** is rejected with a clear message (the app splits it into two ranges for you). Reminders for milestone due dates (`period_due_soon`) are deferred and need notification templates; confirm if you want them before the pilot.
7. **No dated milestones** = one implicit whole-campaign period, so every existing campaign and the demo seed keep working unchanged.
8. **Overlap scope:** per action definition (a vegetarian day entry and a meals entry on the same date remain allowed, as today).
9. **New dependency:** `shared_preferences` for mobile and admin (local preferences). Theme and colour will need a server-side preferences JSON later; not built now.
10. **Scope reality check:** the UX plan's C3, C4 and C5 admin phases are not on `main` (raw participants list, no submissions list API, milestone tab placeholder). This plan folds the minimum needed (P5, A2, A3) in; the rest of C4/C5 (impact and measurement UI) stays as planned.

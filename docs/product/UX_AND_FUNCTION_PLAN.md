# Community Campaign Platform: UX and Functional Plan (Admin Web + Member Mobile)

Status: draft for review · Date: 2026-10-15 · Repo basis: `LeonLuAble/campaign` @ `main`. Read through the GitHub connector, not cloned.
Scope: product/UX and functional plan for `apps/admin` (Flutter web) and `apps/mobile` (Flutter iOS/Android), the shared UI package, the backend gaps they expose, and a build order you can run as one Cursor prompt per phase.

Legend used throughout:
- **MUST** = MVP-must (Tzu Chi Malaysia cannot run 速素数数 without it)
- **NICE** = MVP-nice (ship if cheap, otherwise first post-MVP)
- **LATER** = after MVP
- **✅ exists** / **🟡 partial** / **❌ gap**: describes the current backend or client

---

## 0. TL;DR: key decisions in this plan

1. **The backend is broad but the admin cannot onboard people.** The API has the full campaign engine (Phases 1 to 9). The admin web lacks the operator workflows around it. The single biggest gap is that `POST /customers` only takes `initialAdminUserId` (a UUID of an existing user). There is no way to invite a first customer admin by email, and no user lookup or single-user invite endpoint. The plan adds an "onboard customer + invite first admin" API and wizard first.
2. **One shared design system: Material 3 + theme tokens in a new `packages/ui_kit`, `go_router` `StatefulShellRoute`, and a hand-rolled responsive shell.** No third-party UI kit. No `flutter_adaptive_scaffold`, which Flutter discontinued in April 2025.
3. **Admin IA is two spaces.** The *Platform console* is visible only when `isPlatformAdmin`. The *Customer workspace* has a customer switcher and a permission-aware left nav. A campaign is a tabbed workspace (Overview · Setup · Participants · Review · Milestones · Impact · Dashboard · Report).
4. **The member app is three tabs: Today · Campaigns · Me.** "Today" is a one-tap record card. It never shows ranks, streak-loss, or "behind" red states (不比较、不评判、不归零).
5. **Community leader = a custom role on a community-scoped membership.** The model supports this today (`/roles` plus `memberships.community_id`). Some list endpoints, however, scope by permission and not by community subtree, so the backend needs subtree filtering before leaders get admin-web access.
6. **Fix a privacy issue first.** The seeded `member` role receives **every** `*.read` key (`READ_PERMISSION_KEYS`), including `user_imports.read`. `GET /user-imports/:id/rows` returns raw email/mobile and is filtered only by tenant. From the code, this appears to let any member read import PII. Phase F1 tightens the member role and adds tests.
7. **Activation goes through one public web page** (`/activate`, `/reset-password` on the web app domain). Email links must be real links: today `SmtpEmailTransport` only logs, and there is no base-URL config for links. Native deep links come later.
8. **Build order is 27 small phases in five waves** (Foundations → Admin backbone → Campaign ops → Mobile → Governance). Each phase is sized for one Cursor prompt and has acceptance criteria.

---

## 1. What exists today (grounded inventory)

### 1.1 Backend capability (from `docs/api/API_SPEC.md`, `MVP_READINESS.md`, and module code)

| Area | Status | Notes that matter for UX |
|---|---|---|
| Auth: login (email/mobile), activate, resend, reset, refresh, social boundary | ✅ | `POST /auth/register` exists, but a self-registered user has no membership and so sees nothing. |
| First platform admin `/setup/*` | ✅ | Admin `LoginPage` already embeds `SetupAdminPage` when `setupRequired`. |
| Customers | 🟡 | Create is platform-admin only, with `initialAdminUserId?` (a UUID). `GET /customers` returns only tenants where the caller has a membership, so a platform admin cannot list customers they are not a member of. `PATCH` covers `name` and `isActive`. |
| Communities (arbitrary depth) | ✅ | Create (`parentId`), list, get, and `PATCH {name, parentId, isActive}` with a cycle check (`wouldCreateCycle`). Subtree visibility is applied for community-scoped members. |
| Memberships + roles | 🟡 | `POST /memberships {userId, communityId?}` needs an existing userId. `MembershipResponse` has **no name, email, mobile, or activation status**. Role assign/unassign works, with a last-tenant-admin guard. Custom roles via `/roles` (system role permissions are immutable). No pagination or search. |
| User import | ✅ | upload → mapping → validate → preview → confirm → rows. `communityId` must be a **UUID column** in the CSV. A `review` row status exists, but there is no endpoint to resolve review rows. |
| Invitations | 🟡 | Only through import confirm (activation token + NotificationSender). No `/invitations` resource and no single-user invite. |
| Campaign templates/scopes/campaigns/config/communities | ✅ | Lifecycle draft→published→started→completed. `PATCH`, configuration, and communities are **draft-only**. `rulesStrategy` is a free JSON string, and the admin form exposes it as a text field. |
| Action definitions | ✅ API / ❌ UI | Seeded only by `seed:tzu-chi` (`vegetarian_day`/days, `vegetarian_meal`/meals). No admin screen. |
| Participation, commitments | ✅ | Self-enroll and withdraw. Pledge choices come from `GET /campaigns/:id/commitment-options`. The vegetarian choice names are **Chinese-only strings** in `modules/vegetarian` (no English label or description). |
| Actions + submissions | 🟡 | Record, cancel, admin correct. `approve`/`reject` exist. **No campaign-level submission list or status filter.** The admin "Submissions" page lists actions and shows date/status only. |
| Progress, achievements, milestones | ✅ | Compute-on-read, completion uncapped, manual `evaluate`, append-only history. |
| Measurements, impact factors, outcomes | ✅ | Versioned factors with a required `source`. No numeric defaults. |
| Visualization (TREE) + dashboards | ✅ | Generic `tree`. `displayName: '素心树'` lives in settings. Campaign, community, and participant dashboards. |
| Notifications | 🟡 | In-app inbox, `campaign_started`, `milestone_achieved`, daily reminder, preferences. SMTP/SMS/push transports **log only** (`SmtpEmailTransport.send` logs and sends nothing). |
| Localization | 🟡 | `GET /locales` and `GET /translations` only (no write). Architecture rule: no `name_en`/`name_zh` columns. |
| Reports + CSV | ✅ | Anonymous aggregates. CSV omits `userId` and `participationId`. Logs `report_exported`. |
| Audit | ❌ | No `audit_logs` table. Structured logs only. |
| Tags, goals, files | ❌ | Listed as gaps in MVP_READINESS. Not needed for this plan's MVP. |

### 1.2 Admin web today (`apps/admin/lib`)

| Screen | What it does | Verdict |
|---|---|---|
| `LoginPage` (+ embedded `SetupAdminPage`) | identifier + password; first-admin setup | Keep the logic and restyle. Add forgot password. |
| `CustomerListPage` (home `/`) | List of the caller's customers. Platform admin gets a single name field + "Create" (no admin invite). Locale buttons and logout sit inline. | Replace with the Platform console and the customer switcher. |
| `CustomerHomePage` | Three buttons (communities, import, campaigns) | Replace with the shell nav and an Overview page. |
| `CommunityListPage` | Flat list + create root node only | Replace with a tree editor. |
| `CsvImportPage` | Import pipeline | Restyle as a wizard. Add community-by-name mapping. |
| `AdminCampaignListPage`, `CampaignFormPage` | Create draft. Timezone, dates, and `rulesStrategy` are free-text fields. | Replace with a wizard (pickers, strategy dropdown, action definitions). |
| `CampaignAdminPage` | Status text + publish/start + links | Replace with a tabbed campaign workspace. No "complete" button today. |
| `ParticipantsPage` | Shows **raw `userId`** and status | Needs names (API gap). |
| `SubmissionsPage` | Lists actions; one shared note field; reject only | Replace with a review queue (API gap). |
| `ImpactFactorsPage`, `AggregateDashboardPage`, `CampaignReportPage` | Functional, unstyled | Restyle inside the tabs. |

Cross-cutting gaps in both apps:
- Both apps default to `MemoryTokenStore` (`main.dart` passes no store), so sessions are lost on reload or restart. `SecureTokenStore` already exists in `api_client`.
- Theme is `ColorScheme.fromSeed(0xFF1F4E79)` and nothing else.
- `dashboard_view.dart` is duplicated in both apps.
- There is no navigation shell. Admin routes are flat `GoRoute`s.

### 1.3 Mobile today (`apps/mobile/lib`)
Login, activate (`/activate?token=`), reset, campaign list (first customer only), detail/join, pledge (radio list from API), record (radio list of definitions + quantity field + cancel), progress, participant dashboard/TREE, notifications, preferences. The UI is functional and plain. The language switch and logout sit at the bottom of the campaign list. Own participation is found by listing participations and filtering by `userId`, which works because members are self-scoped.

---

## 2. Personas, roles and permissions

### 2.1 Personas

| Persona | Who (Tzu Chi example) | Primary surface | Implemented as |
|---|---|---|---|
| **Platform admin** | Platform operator (you / support) | Admin web → Platform console | `users.is_platform_admin = true`. A platform flag, not a tenant role. It gives no implicit tenant data access. |
| **Customer admin** | Tzu Chi Malaysia HQ coordinator(s) | Admin web → Customer workspace | System role `tenant_admin` on a **tenant-level** membership (`community_id = null`) |
| **Community / node leader** | Leader of a region, branch, or group node in Tzu Chi's tree (node names are tenant data) | Admin web (scoped), later a light mobile view | **Proposed:** custom role `community_leader` on a **community-scoped** membership. Inherits the subtree via `visibleCommunityIds`. |
| **Member / participant** | Volunteer or member taking the pledge | Mobile app | System role `member` on a membership (tenant-level or community) |

A possible fifth persona, *campaign manager* (tenant-level, campaign-only permissions), is **LATER**. The model already supports it as a custom role, so this needs no backend work.

### 2.2 Permission matrix (mapped to `permission-keys.ts`)

✅ = allowed · 🔸 = allowed but scoped (own rows, or community subtree) · ❌ = not allowed · **P** = platform-only endpoint (new)

| Capability | Permission keys | Platform admin | Customer admin | Community leader (proposed) | Member |
|---|---|---|---|---|---|
| Create customer + invite first admin | `POST /customers` (+ new platform endpoints) | **P** ✅ | ❌ | ❌ | ❌ |
| List all customers (metadata only) | new `GET /platform/customers` | **P** ✅ | ❌ | ❌ | ❌ |
| View/update customer settings | `customers.read/update` | ❌ (unless also a member) | ✅ | read 🔸 | read ✅ (needed for app) |
| Community tree | `communities.create/read/update` | ❌ | ✅ | 🔸 subtree (create children under own node) | read 🔸 |
| Member directory / invite / deactivate | `memberships.read/create/update/delete` | ❌ | ✅ | 🔸 subtree; cannot create tenant-level memberships (already enforced) | ❌ **(today: has `memberships.read`, see G5)** |
| Roles: view / custom roles / assign | `roles.read/create/update/assign` | ❌ | ✅ | read only. **Never `roles.assign`** (see G4) | ❌ **(today: has `roles.read`)** |
| CSV import | `user_imports.create/read` | ❌ | ✅ | NICE: 🔸 into own subtree (service already allows community-scoped upload) | ❌ **(today: has `user_imports.read`, see G5)** |
| Templates / scopes | `campaign_templates.*`, `campaign_scopes.*` | ❌ | ✅ | read | read |
| Campaign create/edit/lifecycle | `campaigns.create/update` | ❌ | ✅ | read | read |
| Action definitions | `action_definitions.*` | ❌ | ✅ | read | read |
| Participants: view / enroll others / withdraw others | `participations.read/create/update` | ❌ | ✅ | 🔸 subtree (**needs G3**) | 🔸 own |
| Record actions | `actions.create` / correct `actions.update` | ❌ | ✅ | 🔸 correct within subtree (NICE, needs G3) | 🔸 own |
| Review submissions | `submissions.read/update` | ❌ | ✅ | 🔸 subtree (needs G3) | read own |
| Commitments | `commitments.create/read/update` | ❌ | ✅ | read 🔸 | 🔸 own |
| Progress / achievements / dashboards | `progress.read`, `achievements.read`, `dashboards.read` | ❌ | ✅ | 🔸 community subtree aggregates (existing community endpoints check visibility) | own + aggregates |
| Milestones (create/update/evaluate) | `milestones.*` | ❌ | ✅ (tenant-level enforced) | read | read |
| Measurements / impact factors / outcomes | `measurement_definitions.*`, `impact_factors.*`, `outcomes.read` | ❌ | ✅ (tenant-level enforced) | read | read own + aggregates |
| Visualization config | `visualizations.*` | ❌ | ✅ | read | read |
| Reports / CSV export | `reports.read/export` | ❌ | ✅ | read 🔸; export 🔸 (decision Q1) | read own |
| Notifications inbox | `notifications.read/update` | ❌ | own | own | own |
| Audit log | new `audit_logs.read` | **P** (platform events only) | ✅ | ❌ | ❌ |

### 2.3 Gaps vs the current model

| # | Gap | Evidence | Fix (phase) |
|---|---|---|---|
| **G1** | A platform admin cannot invite a customer admin by email or see customers they are not a member of | `CustomersController.create` takes `initialAdminUserId`; `listForUser` filters by membership | New onboarding + platform endpoints (B3) |
| **G2** | No `community_leader` role exists out of the box | Only `tenant_admin`/`member` are seeded (`seedSystemRoles`) | Seed a **non-system, editable** `community_leader` role per tenant via an additive migration (B9) |
| **G3** | Several list/manage paths scope by **permission, not community subtree**. `ParticipationService.canManageParticipations` returns all rows when the caller has `participations.create/update`. `actions.listForCampaign` and achievements say "`actions.update` sees all". Permissions are resolved as a **union across all of the user's memberships** in the tenant (`resolvePermissionKeys`). | `participation.service.ts`, `authorization.service.ts`, API_SPEC | Add subtree filtering for callers without a tenant-level membership (B9). Required before leaders use admin web. |
| **G4** | Privilege escalation risk. A holder of `roles.assign` can attach any tenant role, including `tenant_admin`, to a membership they can see. Because permissions are a union, a leader could grant themselves every key (some tenant-level checks still block writes). | `MembershipService.assignRole` has no "assigner must hold these permissions" check | Rule: only tenant-level members may assign roles, and nobody can assign a role whose permissions exceed their own (B9). Until then, never give leaders `roles.assign`. |
| **G5** | The `member` role gets **all** `*.read` keys (`MEMBER_PERMISSION_KEYS = READ_PERMISSION_KEYS + …`). These include `user_imports.read`, `memberships.read`, and `roles.read`. `UserImportService.list/listRows` filter by tenant only, and `UserImportRowResult` includes `email`, `mobile`, and `rawData`. `MembershipService.list` returns all tenant memberships to anyone with a tenant-level membership. | `permission-keys.ts`, `user-import.service.ts`, `user-import.mapper.ts`, `membership.service.ts` | Additive migration: replace the member grant with an explicit allow-list, plus e2e tests that a member gets 403/404 on imports, memberships, and roles (F1). This is an authorization-semantics change (needs your sign-off, Q2). |
| **G6** | No user summary on memberships or participations, so the admin can only show UUIDs | `MembershipResponse`, `ParticipationResponse` | Add `user: {displayName, email?, mobile?, activationStatus}` for callers with `memberships.read` (B1, C3). Contact fields are subject to Q1. |
| **G7** | Platform admin "no implicit data access" has no audited break-glass path | Settled decision | Keep it. A platform admin who needs tenant data is **explicitly added as a member** (audited). The platform console only shows metadata (name, status, created, admin-invite status, counts). |

---

## 3. Admin web: information architecture and functions

### 3.1 Navigation model

```
Public:   /login  /activate?token=  /reset-password?token=   (setup embedded in /login)
Platform: /platform/customers  /platform/customers/new  /platform/customers/:customerId
Customer workspace (shell with left nav), prefix /customers/:customerId
  ├─ Overview                      /
  ├─ Communities                   /communities
  ├─ People                        /people  /people/:membershipId
  │    ├─ Invitations (pending)    /people?status=pending
  │    ├─ Imports                  /people/imports  /people/imports/:importId
  │    └─ Roles                    /people/roles  /people/roles/:roleId
  ├─ Campaigns                     /campaigns  /campaigns/new
  │    └─ :campaignId              /campaigns/:id/{overview|setup|participants|review|milestones|impact|dashboard|report}
  ├─ Review queue (all campaigns)  /review                        (NICE)
  ├─ Reports                       /reports                       (cross-campaign entry; MUST via campaign tab)
  ├─ Notifications                 /notifications                 (templates + own inbox)
  ├─ Audit log                     /audit
  └─ Settings                      /settings
```

- **Shell layout:**
  - Width ≥ 1200 (expanded): `NavigationDrawer` (permanent, 280 px).
  - 840–1199 (medium): `NavigationRail` with labels.
  - Below 840 (compact): modal drawer. The admin is desktop-first but must stay usable on a tablet.
- **Top bar:**
  - Customer switcher (dropdown of `GET /customers`, plus "Platform console" when `isPlatformAdmin`)
  - Breadcrumbs
  - Language toggle (EN / 中文)
  - User menu (profile, logout)
- **Permission-aware nav:** items are hidden when the caller lacks the key. This needs `GET /customers/:id/access` (B1). Hiding is for convenience only; the backend remains the authority.
- **Routing:** `go_router` `StatefulShellRoute.indexedStack` for the left nav. A nested `ShellRoute` for campaign tabs keeps each tab's state. The `/customers/:customerId` prefix is kept to limit churn.

### 3.2 Section-by-section functions

API column: ✅ exists · ❌ gap (see §6 for the gap ID).

#### A. Platform console (platform admin only)

| Function | Screen / UX | API | Priority |
|---|---|---|---|
| List customers (name, status, created, admin status) | Table with search | ❌ B-API-2 `GET /platform/customers` | MUST |
| **Create customer + first admin** | 3-step wizard: (1) Organisation: name, default locale (zh-Hans/en), default timezone (default `Asia/Kuala_Lumpur`). (2) First admin: email, display name, preferred locale. (3) Review → Create. The success screen shows "Invitation sent to x@y" and a Resend button. | ❌ B-API-1 (extend `POST /customers` with `initialAdmin`) | MUST |
| Resend admin activation / invite an additional admin (recovery) | Customer detail → "Admins" card | ❌ B-API-3 | MUST |
| Deactivate / reactivate customer | Customer detail, confirm dialog | 🟡 `PATCH /customers` requires a tenant membership → ❌ platform variant | NICE |
| Platform audit (customer created, admin invited) | Customer detail → activity list | ❌ B-API-20 | NICE |
| First platform admin setup | Existing embedded setup page (restyled) | ✅ | MUST (restyle) |

**Activation flow for the first customer admin (end to end):**
1. The platform admin submits the wizard.
2. The API runs one transaction:
   - creates the tenant and seeds roles;
   - **finds or creates** the user by email identity (if the identity exists, reuse that user, which is consistent with "no auto-merge" because it is the same identity);
   - creates a tenant-level membership and assigns `tenant_admin`.
3. After commit, the API sends either:
   - **activation** (new or unverified identity), via the existing `RegistrationService.sendActivationInvitation`; or
   - an **"added to customer" notice** (already active user).
4. The email link is `${PUBLIC_WEB_BASE_URL}/activate?token=…` (new config). The admin web `/activate` page sets the password through `POST /auth/activate`, then redirects to `/login`.
5. The platform admin is **not** added as a member, which matches the existing `initialAdminUserId` semantics.

#### B. Customer overview

| Function | UX | API | Priority |
|---|---|---|---|
| At-a-glance: members (active / pending activation), communities, campaigns by status | Metric tiles | ❌ B-API-5 (counts) or compose from lists | MUST (compose first) |
| "Next steps" checklist for a new customer (create communities → import/invite members → create campaign → publish) | Checklist card | client-side | MUST |
| Live campaign tiles with TREE thumbnail + aggregate completion | Cards linking to the campaign | ✅ dashboards | NICE |

#### C. Communities (tree management)

| Function | UX | API | Priority |
|---|---|---|---|
| View tree (expand/collapse) | Indented tree list with an "Add child" action on each row | ✅ list (build tree client-side from `parentId`) | MUST |
| Create root/child node | Inline dialog | ✅ | MUST |
| Rename / deactivate | Row menu | ✅ `PATCH` | MUST |
| Move node (re-parent) | "Move to…" dialog with a tree picker. Show a cycle error from the API. | ✅ `PATCH parentId` | NICE |
| Node detail: members in the subtree, leaders, campaigns targeting it | Side panel | 🟡 (client-side until B-API-4 filters) | NICE |
| Bulk create from CSV (paths like `Region/Branch/Group`) | Upload | ❌ | LATER |

#### D. People: members, invitations, roles

| Function | UX | API | Priority |
|---|---|---|---|
| Member directory: name, identifier (masked per Q1), community, roles, status (active / pending activation / deactivated) | Paginated table, search box, filters (community subtree, role, status) | ❌ B-API-4 (user summary + pagination/search) | MUST |
| **Invite single member** (email or mobile, display name, community, roles) | Dialog | ❌ B-API-6 | MUST |
| Resend activation | Row action on pending members | ❌ B-API-7 (`/auth/activate/resend` exists for the user's own identifier only; an admin-triggered variant is needed) | MUST |
| Copy one-time activation link (for WhatsApp / mobile-only members) | Row action, behind Q5 | ❌ | NICE (decision) |
| Deactivate / reactivate membership | Row action + confirm. The API's last-admin guard is surfaced as a friendly message. | ✅ | MUST |
| Change community (move member) | Member detail | ❌ (`PATCH /memberships` takes only `isActive`) | NICE |
| Assign / unassign roles | Member detail → role chips + "Add role" | ✅ | MUST |
| Roles list (system vs custom) and custom role editor (name, description, permission checklist grouped by area, with descriptions from `GET /permissions`) | List + editor | ✅ | MUST (list/assign), NICE (custom editor) |
| Pending invitations view | Directory filter `status=pending` | ❌ via B-API-4 | MUST |

#### E. Imports

| Function | UX | API | Priority |
|---|---|---|---|
| Wizard: Upload → Map columns → Validate → Preview → Confirm → Results | `WizardStepper` with a sticky footer (Back/Next). Mapping uses dropdowns per canonical field, auto-detected (`detectCanonicalMapping`). | ✅ | MUST |
| Downloadable CSV template (headers explained in en/zh) | Button | client-side asset | MUST |
| Default community for the whole file | Community tree picker at upload | ✅ (`communityId` query) | MUST |
| Map community by **name/path** instead of UUID | Mapping step | ❌ B-API-8 | MUST (Tzu Chi staff will not have UUIDs) |
| Resolve `review` rows (pick existing user / create new / skip) | Results step | ❌ B-API-9 | NICE |
| Error report download | Results → "Download errors CSV" (client-side from rows) | ✅ rows | MUST |
| Import history | List with counts | ✅ | MUST |

#### F. Campaigns

**F1. Campaign list:** a table/cards with status chip, dates, participants count, and quick actions. Filter by status. **MUST.** The participants count needs B-API-10 or one call per row.

**F2. Create/edit wizard** (draft only, because the API rejects `PATCH` after draft):

| Step | Fields | API | Priority |
|---|---|---|---|
| 1 Basics | Name, description (multi-line), template + scope (dropdowns; "Create new…" inline for templates and scopes) | ✅ (template/scope create exists) | MUST |
| 2 Schedule | Start/end **date pickers**, **timezone picker** (searchable IANA list, default customer timezone) | ✅ | MUST |
| 3 Audience | "Whole organisation" or pick communities (tree multi-select) | ✅ `PUT /communities` | MUST |
| 4 Rules | **Rules strategy dropdown** from the API (`vegetarian` = 速素数数 rules / generic). Pledge choices preview (read-only from `commitment-options` after save). Submission review: Auto (default) / Manual, with explanation. | ❌ B-API-11 (`GET /campaign-rule-strategies`); ✅ config | MUST |
| 5 Actions | Action definitions editor (name, unit, key, active). "Apply recommended definitions" button, fed by the strategy descriptor so no vegetarian logic lives in Flutter. | ✅ CRUD; ❌ B-API-11 for recommendations | MUST |
| 6 Visualization | TREE on/off, display name (素心树), plus whatever other settings the visualization payload supports | ✅ `PUT /visualization` | NICE |

**F3. Lifecycle:**

| Function | UX | Priority |
|---|---|---|
| Publish | A "Ready to publish" checklist: name, dates, timezone, ≥1 active action definition, rules strategy set, audience, review mode chosen. Impact factors are optional (warn only). Confirm dialog explains that members can now see and join, and that setup is locked. | MUST |
| Start | Confirm dialog: "Enrolled participants will be notified (campaign_started)" | MUST |
| Complete | Confirm: "Recording closes; action definitions lock; history is kept" | MUST (button missing today) |
| Edit after publish (description, extend end date) | Locked fields shown with a lock icon. Allowed fields depend on Q6. | NICE (❌ B-API-12) |
| Duplicate campaign as new draft | n/a | LATER |

**F4. Participants tab:**

| Function | API | Priority |
|---|---|---|
| Table: name, community, pledge choice + target, completion % (uncapped; "Achieved"/"Exceeded" chips; **no sorting by completion**, to honour 不比较), status, enrolled date | ❌ B-API-10 (enriched + paginated) | MUST |
| Filters: community subtree, status, pledge choice | ❌ B-API-10 | MUST |
| Enroll member(s) on behalf | ✅ (`userId`) + member picker (B-API-4) | NICE |
| Withdraw on behalf | ✅ | MUST |
| Participant detail drawer: commitment, actions list, progress, correct/cancel action | ✅ | NICE |

**F5. Review tab (submission queue):**

| Function | API | Priority |
|---|---|---|
| Manual mode: queue of `submitted` rows (participant name, date, definition, quantity, recorded-by), approve/reject with optional note, bulk approve | ❌ B-API-13 (`GET /campaigns/:id/submissions?status=&communityId=`) and B-API-14 bulk | MUST if any campaign uses manual; otherwise NICE |
| Auto mode: "Recent records" spot-check list with reject + note | ❌ B-API-13 | NICE |
| Rejection notice to member, worded gently ("This record was not counted", plus the note) | ❌ B-API-15 | NICE |

**F6. Milestones tab:** list with live progress bar (`/milestones/:id/progress`), create/edit (name, metric `completion_percent`/`achieved_value`, threshold, unit), **Evaluate** button with confirm ("first crossing notifies participants"), and evaluation history. ✅ API · **MUST** (list/create/evaluate), NICE (edit).

**F7. Impact tab:**
- Measurement definitions CRUD.
- Impact factors list with version chain per (sourceUnit → outcomeMetric).
- Create a version: value, outcome unit, **source citation required**, effective-from/to. Show the "immutable once created; a new version closes the previous one" explanation.
- Campaign override vs tenant-wide badge.
- Outcome preview from `/campaigns/:id/outcomes`.

✅ API (UI partial today) · **MUST** (factors list/create), NICE (measurement definitions UI).

**F8. Dashboard tab:** campaign dashboard plus a community picker that switches to the community dashboard. Day/week toggle, metric tiles, time series, TREE. ✅ API · **MUST**. A pledge-choice distribution (counts per 随缘素…已全素, an aggregate and not a ranking) is ❌ B-API-16 · NICE.

**F9. Report tab:** campaign report, community report (picker), CSV export (logged), and a note that "Reports never include contact details." ✅ · **MUST**.

#### G. Notifications

| Function | API | Priority |
|---|---|---|
| Own inbox (admins also receive notifications) | ✅ | NICE |
| Template viewer: list stored templates (activation, password reset, campaign started, milestone achieved, action reminder) per locale, read-only | ✅ `GET /translations` | NICE |
| Template editing per tenant | ❌ B-API-17 | LATER |
| Campaign reminder default time (tenant/campaign default; users can still override) | ❌ | LATER |
| Broadcast announcement to campaign participants (in-app) | ❌ | LATER |

#### H. Settings

| Function | API | Priority |
|---|---|---|
| Customer name, active flag | ✅ `PATCH /customers` | MUST |
| Default locale & timezone for the customer (used by invites, campaign defaults) | ❌ B-API-18 | NICE |
| Branding (logo, primary colour) | ❌ | LATER |
| My profile (display name, language, password change) | 🟡 `PATCH /me` covers locale/timezone only → ❌ B-API-19 | NICE |

#### I. Audit trail

| Function | API | Priority |
|---|---|---|
| Audit log list: who, what, when, target. Filters by actor, action type, date. Covers customer created, admin invited, member invited/deactivated, role assigned/removed, import confirmed, campaign lifecycle, submission reviewed, impact factor version created, report exported. | ❌ B-API-20 (`audit_logs` + `GET /audit-logs`) | MUST (the MVP spec lists "Privacy and audit"; readiness marks audit partial) |
| Export audit CSV | ❌ | LATER |

---

## 4. Member mobile app: screens and flows

### 4.1 Structure

- **Bottom `NavigationBar`, three tabs:**
  - **Today** (home)
  - **Campaigns**
  - **Me**
- Notifications bell with an unread badge in the top app bar of Today.
- Public stack: Welcome/Language → Login → Activate → Reset password.
- Tone: calm, encouraging, never comparative. Copy reflects 不比较、不评判、不归零. No streak counters that "break", no red for "behind", no leaderboards.

### 4.2 Flows and screens

#### Onboarding / login / activation (MUST)
1. **First launch:** language picker (中文 / English, defaults from device locale) → 2 to 3 welcome cards explaining the campaign spirit → Login.
2. **Login:** a single identifier field (email or Malaysian mobile, format-only validation) + password. Links: "First time? Activate your account" and "Forgot password". Social buttons stay hidden unless client IDs are set (existing rule).
3. **Activation:** the email/SMS link opens the **web** `/activate` page (§3.2 A). It sets the password, then shows "Open the app" or store badges. **In-app fallback:** an "Activate" screen that accepts a pasted token/link and runs `POST /auth/activate`. It already exists at `/activate?token=` and gets restyled. Resend activation by identifier (✅ `/auth/activate/resend`).
4. **Reset:** request → check message (no enumeration) → set new password (✅).
5. **Customer resolution:** if `GET /customers` returns more than one, show a one-time picker (switchable in Me). Today the session silently takes `customers.first`. If none, show "Your account is not linked to an organisation yet. Please contact your coordinator."
6. **Self-registration:** off for MVP (Q4). The API exists, but users would have no membership.

#### Today (home) (MUST)
- One **Today card per started campaign** the member is enrolled in:
  - Header: campaign name, today's date in the campaign timezone, pledge summary ("一周素 · 7 days").
  - **Days unit:** one large toggle button, "I ate vegetarian today" → recorded state with an "Undo" (cancel).
  - **Meals unit:** a 1 / 2 / 3 meals segmented selector + "Save". The rule allows 1 to 3; the server validates.
  - Small progress ring (completion %, uncapped: at 120% the ring is full and the label reads "Exceeded").
  - "Record an earlier day" link → record screen.
- Below the cards: a **community aggregate** strip ("Our community has recorded N vegetarian meals") and the TREE thumbnail.
- Enrolled campaign that has not started yet: "Starts on <date>" + "Make / change your pledge".
- Not enrolled: shows published/started campaigns to join.
- API: composes today from existing endpoints. A summary endpoint (❌ B-API-21 `GET /me/participations`) is NICE for performance.

#### Campaigns (discovery and join) (MUST)
- List of visible campaigns (published/started; completed under "Past"). Each shows a status chip, dates, and an enrolled badge.
- Detail: description, dates, how it works (from the rules strategy), community total, **Join** (published or started). After joining → pledge.
- Withdraw (Me → campaign settings, or detail overflow), with a confirm dialog that says history is kept. Re-join restores the same participation.

#### Commitment / pledge (MUST)
- **Choice cards** for the 7 choices (from `commitment-options`). Each card has the name (随缘素 …), a one-line explanation in the current locale, and its unit. Cards are not ranked or graded.
  - Today the API returns Chinese names only, so English labels and descriptions are ❌ B-API-22.
- Target input appears only when the choice needs it:
  - Suggested target is prefilled (一周素 = 7, 全月素 = 30, from `suggestedTarget`).
  - 已全素 shows "Whole campaign (N days)" (`usesCampaignDuration`) and needs no input.
- Review → "Make my pledge". "Change pledge" is allowed while published or started (create-or-replace).

#### Daily action / submission (MUST)
- **Record screen:**
  - Month calendar of the campaign window. Each day shows recorded / not recorded / not counted (rejected).
  - Tap a past day to record (future days are disabled, because the API rejects them).
  - Day detail: recorded quantity, status, Undo.
- Duplicate day returns 409. The UI shows "Already recorded" and offers "Change" (cancel + re-record; members cannot PATCH).
- Idempotency key per attempt, kept until a success response, so retries on flaky networks are safe. Today `RecordActionPage` builds a new key from a timestamp on every tap, so a re-tap after a timeout is a new request. The duplicate-day 409 still protects the data, but the user sees an error.
- Rejected record shows "Not counted" with the admin's note, in neutral styling.

#### Personal progress (MUST)
- Big completion figure (uncapped) with status label (Not started / In progress / Achieved / Exceeded), achieved vs target, and unit.
- Cumulative totals (days or meals), which never reset.
- Calendar heat (neutral greens, no red).
- Impact (outcomes) when impact factors exist: "≈ X <outcome unit>". Tapping it shows the factor source citation and version.
- Personal TREE (participant dashboard payload).

#### Community progress (MUST, no ranking)
- My community node (subtree) aggregate plus the campaign-wide aggregate: total days/meals, outcomes, TREE, and the day/week chart. Show participant counts only if the payload provides them.
- **Explicitly no lists of people, no ranks, no "top communities".**
- When a milestone is reached, show a "Milestone reached" banner (from the notification).

#### Notifications (MUST)
- Inbox list (newest first), unread dot, tap → mark read + deep link to the campaign or Today. Unread badge count is computed client-side.
- Push notifications: LATER (vendor decision). In-app and reminder scheduling already exist.

#### Me: profile, language, privacy (MUST unless marked)

| Item | API | Priority |
|---|---|---|
| Display name | ❌ B-API-19 | NICE |
| Language (中文 / English) | ✅ `PATCH /me {locale}` | MUST |
| Timezone (auto-detect, editable) | ✅ | NICE |
| Reminder settings: on/off, time, channels (in-app/email; SMS/push hidden until vendors exist) | ✅ preferences | MUST |
| My campaigns: pledge, withdraw | ✅ | MUST |
| Privacy explainer: "Your daily records are private. Coordinators can see them only to review records. Your community sees totals only." A privacy-level picker is LATER (sharing rules not implemented). | n/a | MUST |
| Change password | ❌ (use the reset flow for MVP) | NICE |
| **Delete my account** (required for app-store review when accounts are created in-app or by invitation; Apple guideline 5.1.1(v)) | ❌ B-API-23 | MUST before store submission (Q7) |
| Switch organisation, logout | ✅ | MUST |

---

## 5. UI framework and design system

### 5.1 Options compared

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Material 3 (built-in) + custom theme tokens via `ThemeData` + `ThemeExtension`** | Already in use. Zero extra dependencies. Complete widget set (NavigationBar/Rail/Drawer, DataTable, DatePicker, SearchAnchor, SegmentedButton). Strong accessibility (Semantics, focus, text scaling). Works on web, iOS, and Android. Easy for Cursor to generate correctly. | Default look is generic unless tokens are applied carefully | **Recommended** |
| Material 3 + Cupertino adaptive (`.adaptive` constructors on iOS) | Native feel on iPhone at no cost | Two visual dialects to test | Use only for switches/dialogs on iOS (cheap). Not a separate system. |
| shadcn_ui / forui (shadcn-style kits) | Modern "SaaS" look | 0.x versions with breaking minors, own widget vocabulary (Cursor makes more mistakes), and bigger bundles. A comparison reports +1.2 MB and +3.9 MB. Gaps such as data table and pagination are listed as incomplete in shadcn_ui. | Not for MVP |
| `flutter_adaptive_scaffold` | Canonical M3 adaptive layouts | **Discontinued by the Flutter team (30 Apr 2025)**. The community successor `adaptive_scaffold_router` is very new (0.1.x). | Avoid. Hand-roll a ~150-line `AppShell`. |
| Data grids (`data_table_2`, PlutoGrid/Trina, Syncfusion) | Sticky headers, virtualisation | Extra dependency; Syncfusion licensing | Start with M3 `DataTable` + server pagination wrapped in `ui_kit`. Swap the implementation behind `AppDataTable` later if needed. |
| Charts: `fl_chart` vs custom paint | `fl_chart` is mature and MIT | One dependency | `fl_chart` in `ui_kit` for time series only. TREE stays custom. |
| State management (Riverpod/Bloc) | n/a | `.cursor/rules/flutter-conventions.mdc` says **do not add a new state framework** | Keep `SessionController`/`ApiScope`. Add a tiny `AsyncController<T>` (ChangeNotifier) helper. |
| Routing | `go_router` already used and mandated | n/a | `go_router` with `StatefulShellRoute` (admin nav, mobile tabs) |

> Note: Flutter 3.47 published standalone `material_ui` / `cupertino_ui` 1.0 packages, and the in-SDK libraries are scheduled for deprecation. Keep every `material.dart` import behind `ui_kit` re-exports where practical, so that migration is a single later chore and not part of this plan.

**Decision:** Material 3 + design tokens in `packages/ui_kit`, `go_router` shells, a hand-rolled responsive `AppShell`, M3 `DataTable` wrapped as `AppDataTable`, and `fl_chart` for time series. No new state framework.

### 5.2 Package layout

```
packages/ui_kit/                      (pure presentation; depends on flutter, fl_chart; NOT on api_client)
  lib/ui_kit.dart                     (barrel export)
  lib/src/tokens/{colors,spacing,radius,typography,elevation,motion,breakpoints}.dart
  lib/src/theme/app_theme.dart        (AppTheme.light()/dark(); ColorScheme + ThemeExtension<AppTokens>)
  lib/src/layout/{app_shell,page_scaffold,responsive}.dart
  lib/src/components/...              (see 5.4)
  lib/src/visualization/{tree_view,progress_ring,time_series_chart,metric_tile}.dart
  test/  (golden + widget tests for components at en/zh, 1.0x and 2.0x text scale)
```

- Strings: `ui_kit` widgets take labels as parameters. Each app passes localized strings from its own ARB, so `ui_kit` needs no l10n delegate.
- Domain-shaped widgets (TREE, progress ring, choice card) take primitives (`double completion`, `String label`), not `api_client` models. Each app maps models to widgets.
- Move the duplicated `dashboard_view.dart` from both apps into `ui_kit` components.

### 5.3 Theme tokens

The values are a starting proposal. The primary colour keeps the existing seed `#1F4E79`.

| Token group | Values |
|---|---|
| **Color roles** | `primary #1F4E79` (deep blue, trust); `secondary #3F7D58` (growth green for progress/TREE); `tertiary #B7791F` (warm amber for celebration accents); `surface #FAFAF7` (warm paper); `surfaceContainer*` tonal steps from M3; `error #B3261E` (**only** for system errors, never for low progress); `success #2E7D32`; `warning #8A6D00`; `info` = primary. Generate the full ColorScheme with `ColorScheme.fromSeed(seedColor: primary, secondary: …, tertiary: …)` and verify contrast. |
| **Semantic progress colors** | `progressNone` (outline grey), `progressInProgress` (secondary at 70%), `progressAchieved` (secondary), `progressExceeded` (secondary + tertiary accent). No red or orange for "behind". |
| **Spacing** | 4, 8, 12, 16, 24, 32, 48 (`AppSpace.xs…xxl`) |
| **Radius** | 4 (inputs), 8 (chips), 12 (cards), 20 (sheets), full (pills) |
| **Elevation** | 0 (default, tonal surfaces), 1 (cards on hover), 3 (menus/dialogs) |
| **Typography** | M3 type scale. Mobile body 16/24, admin body 14/20, minimum 12 on admin and 14 on mobile. Line height ≥ 1.5 for CJK body text. No letter-spacing on CJK. |
| **Motion** | 150 ms (micro), 250 ms (standard), emphasized easing. Respect `MediaQuery.disableAnimations`. |
| **Breakpoints** | compact < 600, medium 600–839, expanded 840–1199, large ≥ 1200 (M3 window classes) |
| **Density** | Admin uses `VisualDensity.compact` on expanded+ widths; mobile uses standard. |
| **Dark mode** | Tokens defined; ship light only for MVP (NICE). |

### 5.4 Shared component list (`ui_kit`)

| Component | Used by | Notes |
|---|---|---|
| `AppShell` (drawer/rail/bottom bar by breakpoint) | admin, mobile | Takes destinations + `StatefulNavigationShell` |
| `PageScaffold` (title, breadcrumbs, primary/secondary actions, body) | admin, mobile | Consistent page header |
| `SectionCard`, `KeyValueList` | both | |
| `AppDataTable` (server pagination, row actions, selection, empty/loading/error) | admin | Wraps M3 `DataTable` |
| `FilterBar` + `SearchField` | admin | |
| `StatusChip` (campaign, submission, membership, activation, progress) | both | Colour + icon + text (never colour alone) |
| `ConfirmDialog` (lifecycle + destructive variants) | both | |
| `AppTextField`, `AppDropdown`, `AppDatePickerField`, `TimezonePickerField`, `CommunityTreePicker` (single/multi), `RoleMultiSelect` | admin (mostly) | Format-only validation (per rules) |
| `WizardStepper` | admin | Create customer, campaign, import |
| `TreeListView` (expand/collapse hierarchy) | admin | Communities |
| `EmptyState`, `ErrorState` (retry + correlation id), `LoadingSkeleton` | both | `api_client` error envelope → message + code |
| `AppSnackbar` helpers | both | |
| `ProgressRing` / `ProgressBar` (uncapped label, overflow accent) | both | |
| `MetricTile`, `TimeSeriesChart` (day/week) | both | `fl_chart` |
| `TreeVisualization` (rendered from completion) | both | Includes a text alternative |
| `ChoiceCard` | mobile | Pledge |
| `RecordDayButton`, `MealCountSelector`, `CampaignCalendar` | mobile | |
| `LocaleSwitcher` | both | EN / 中文 |
| `PermissionGate` (shows/hides by a permission set passed in) | admin | Convenience only |

### 5.5 Accessibility (both apps)
- WCAG 2.2 AA: text contrast ≥ 4.5:1, large text ≥ 3:1, verified for all token pairs (add a unit test that computes contrast).
- Touch targets ≥ 48×48 dp on mobile. Admin hit targets ≥ 32 px with keyboard focus rings.
- Test at text scale 1.0, 1.3, and 2.0. Many members may be older volunteers, so layouts must reflow and never clip. Avoid fixed-height rows.
- Status is never colour-only; always icon + text.
- `Semantics` labels on icon buttons, the TREE (e.g., "素心树, 64% of campaign target"), and progress rings.
- Admin web: full keyboard navigation (Tab order, Enter/Space, Esc closes dialogs), visible focus, skip-to-content, and table headers announced.
- Respect the reduce-motion setting.

### 5.6 zh-Hans / en typography and localization notes
- **Fonts:** do not bundle a CJK font for MVP (a full Noto Sans SC is many MB). Use the platform defaults (iOS PingFang SC, Android Noto Sans CJK) and set `fontFamilyFallback: ['PingFang SC', 'Noto Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei', 'sans-serif']`. On Flutter web, missing glyphs fall back to Noto fonts fetched at runtime, so check that the hosting network allows it or bundle a subset later.
- Han glyph variants come from locale. `MaterialApp.locale` is set to `zh_Hans`, so SC forms are used. Chinese content such as `随缘素` also appears **inside the English UI**, so put SC fonts first in the fallback list to avoid JP glyph shapes.
- Use line height ≥ 1.5 for CJK paragraphs. No italics or ALL CAPS for emphasis (they do nothing for Han). Use weight instead.
- English strings are typically longer than Chinese. Design for +40% label length; buttons must wrap or ellipsize gracefully. Test both locales in golden tests.
- Numbers and dates go through `intl` with locale (`yyyy年M月d日` vs `d MMM yyyy`). Campaign-local dates come from the API as ISO dates; never shift them by device timezone.
- Keep ARB keys shared in meaning across apps. `ui_kit` gets strings passed in.
- Tenant content (campaign name/description, TREE display name, choice labels) is **data**, not ARB. See B-API-22 and Q3.

---

## 6. Backend gaps exposed by this plan

Numbered for reference from §3/§4. Every change follows the existing conventions: additive migrations, permission guard + tenant scope, contract updates in `packages/api-contracts`, `api_client` + `FakeCampaignApiClient`, and e2e tests.

| ID | Gap | Proposed API / entity | Needed by | Priority |
|---|---|---|---|---|
| **F-SEC-1** | Member role has all `*.read` keys, so import rows (PII), memberships, and roles appear readable by members (G5) | Migration: member = explicit allow-list (`customers.read`, `communities.read`, `campaigns.read`, `campaign_templates.read`, `campaign_scopes.read`, `action_definitions.read`, `participations.read`, `actions.read`, `submissions.read`, `commitments.read`, `progress.read`, `achievements.read`, `milestones.read`, `measurement_definitions.read`, `measurements.read`, `impact_factors.read`, `outcomes.read`, `visualizations.read`, `dashboards.read`, `notifications.read`, `reports.read` + existing self-create keys). Remove `memberships.read`, `roles.read`, `user_imports.read`. Add e2e tests. | Privacy | **MUST, first** |
| B-API-1 | Onboard customer with first admin by email | Extend `POST /customers` with `initialAdmin?: {email, displayName?, locale?}` (mutually exclusive with `initialAdminUserId`). Find-or-create the identity, then send activation or an "added" notice after commit. | Platform wizard | MUST |
| B-API-2 | Platform customer listing | `GET /platform/customers` → `{id, name, slug, isActive, createdAt, adminCount, pendingAdminInvites}` only | Platform console | MUST |
| B-API-3 | Platform admin invite/resend for a customer (recovery) | `POST /platform/customers/:id/admins {email, displayName?}`; `POST /platform/customers/:id/admins/:userId/resend` | Platform console | MUST |
| B-API-4 | Member directory data | `GET /memberships?customerId&q&communityId&includeDescendants&roleKey&status&limit&cursor` returning `user: {id, displayName, email?, mobile?, activationStatus: 'pending'|'active'}` | People | MUST |
| B-API-5 | Overview counts | `GET /customers/:id/summary` (members by status, communities, campaigns by status) | Overview | NICE |
| B-API-6 | Single invite | `POST /memberships/invitations {email?|mobile?, displayName?, communityId?, roleKeys?}`. Reuse `IdentityAccountService` + `MembershipService` + activation. Idempotent per identifier. | People | MUST |
| B-API-7 | Admin-triggered resend | `POST /memberships/:id/resend-activation` (`memberships.update`) | People | MUST |
| B-API-8 | Import community by name/path/slug | New canonical field `communityPath` (e.g. `Region/Branch`) resolved within the tenant; unknown path → row error | Imports | MUST |
| B-API-9 | Resolve `review` rows | `POST /user-imports/:id/rows/:rowId/resolve {action: 'link'|'create'|'skip', userId?}` | Imports | NICE |
| B-API-10 | Enriched participants | `GET /campaigns/:id/participations?q&communityId&status&choice&limit&cursor` with `user.displayName`, `communityName`, `commitment {typeKey,label,targetValue,unit}`, `completionPercent`, `status` (no server sort by completion) | Participants | MUST |
| B-API-11 | Rule strategy catalog | `GET /campaign-rule-strategies` → `[{key, label, description, units, reviewModes, recommendedActionDefinitions}]`, served by the strategy registry (vegetarian stays in `modules/vegetarian`) | Campaign wizard | MUST |
| B-API-12 | Safe post-publish edits | `PATCH /campaigns/:id` allows `description`, and `endsOn` extension only, when published/started (Q6) | Campaign edit | NICE |
| B-API-13 | Submission queue | `GET /campaigns/:id/submissions?status&communityId&from&to&limit&cursor` with participant display name, action, and definition | Review | MUST (if manual) |
| B-API-14 | Bulk review | `POST /submissions/review {ids[], decision, note?}` (per-row results) | Review | NICE |
| B-API-15 | Rejection notice | Notification type `submission_rejected` (gentle template, en/zh-Hans) | Review / mobile | NICE |
| B-API-16 | Pledge choice distribution | Add `commitmentsByType` counts to campaign/community dashboards (aggregate only) | Dashboards | NICE |
| B-API-17 | Tenant template overrides | Write endpoint for `translations` (tenant namespace) | Notifications | LATER |
| B-API-18 | Customer defaults | Tenant `default_locale`, `default_timezone` (additive columns) + `PATCH /customers` | Settings, invites | NICE |
| B-API-19 | Profile | `PATCH /me {displayName}`; `POST /me/password {current, next}` | Me / admin profile | NICE |
| B-API-20 | Audit | `audit_logs` table (tenant_id nullable for platform events, actor_user_id, action, target_type, target_id, metadata jsonb without secrets/PII, created_at). Written from customer, membership, role, import, campaign lifecycle, submission review, impact factor, report export. `GET /audit-logs?customerId&actor&action&from&to&cursor` (new `audit_logs.read`, tenant_admin). Platform events visible via a platform endpoint. | Audit | MUST |
| B-API-21 | Member home summary | `GET /me/participations?customerId` → campaign, commitment, today status, completion | Mobile Today | NICE |
| B-API-22 | Localized tenant/strategy content | Return commitment choice `label` + `description` per `Accept-Language` from the `translations` catalog (vegetarian namespace). Campaign name/description/TREE display name translations via the `translations` table (Q3). | Mobile pledge, campaign | MUST (choice labels), NICE (campaign content) |
| B-API-23 | Account deletion | `POST /me/deletion-request` → deactivate user, revoke tokens, anonymize profile + identities. Keep actions for aggregate history (needs a privacy decision, Q7). | Store compliance | MUST before store |
| B-API-24 | Leader subtree scoping + safe role assignment (G3, G4) | Subtree filter on participations/actions/submissions/achievements lists and on management actions for non-tenant-level callers. Role assignment restricted to tenant-level callers and to roles within the assigner's permissions. Seed a `community_leader` role. | Leaders | MUST before leaders use the admin |
| B-API-25 | Caller access | `GET /customers/:id/access` → `{roles[], permissionKeys[], isTenantLevel, communityIds[]}` | Admin nav | MUST |
| B-OPS-1 | Real email + links | Implement the SMTP transport with `nodemailer`. Add a `PUBLIC_WEB_BASE_URL` env and build `/activate?token=` and `/reset-password?token=` links. Bilingual activation/reset templates. | Activation email | MUST |
| B-OPS-2 | Push | FCM/APNs transport behind the existing `PushTransport` | Mobile | LATER |

---

## 7. Phased build order (one Cursor prompt per phase)

**Prompt pattern for every phase.** This follows `CURSOR_DEVELOPMENT_GUIDE.md`: read the canonical docs and this plan section, inspect the files named, implement only this phase, and update `packages/api-contracts`, `packages/api_client` **and** `fake_campaign_api.dart` when the API changes. Add ARB keys in `app_en.arb` + `app_zh_Hans.arb` (no hardcoded strings), add tests, and run:
- `npm run build && npm run lint && npm test && npm run test:e2e` (api)
- `flutter analyze && flutter test` (each touched Flutter package)

Each phase should touch at most about 15 files. If it grows beyond that, split it. Update `docs/api/API_SPEC.md` / `MVP_READINESS.md` when behaviour changes.

### Wave 0: Safety and foundations

| # | Phase | Scope | Acceptance criteria |
|---|---|---|---|
| **F1** | Tighten member role (G5 / F-SEC-1) | Additive migration replacing `member` grants with the allow-list; update `MEMBER_PERMISSION_KEYS`; e2e | A member gets 403 on `GET /user-imports`, `/user-imports/:id/rows`, `/memberships`, `/roles`. `mvp-journey.e2e-spec.ts` still passes. Existing tenants are migrated, new tenants are seeded the same way. API_SPEC updated. *(Gated by Q2.)* |
| **F2** | `packages/ui_kit` foundation | Create the package with tokens, `AppTheme`, `PageScaffold`, `StatusChip`, `EmptyState`/`ErrorState`/`LoadingSkeleton`, `ProgressRing`, `MetricTile`. Move `dashboard_view` + TREE into it. Both apps use `AppTheme` and the shared dashboard. | Both apps build. Existing widget tests pass. `ui_kit` has golden tests for 5+ components in en & zh at 1.0x/2.0x. Contrast test passes. No screen behaviour changes. |
| **F3** | Persistent sessions + public auth pages on web | `SecureTokenStore` in both `main.dart`; admin routes `/activate`, `/reset-password` (public); router public-path handling; forgot-password link on admin login | Reload keeps the admin logged in. App restart keeps the mobile session. `TOKEN_REUSED` still logs out. Activation/reset pages work against the fake client in widget tests. |
| **F4** | Real email + links (B-OPS-1) | `nodemailer` SMTP transport, `PUBLIC_WEB_BASE_URL` env (validated in production), link building, en/zh-Hans activation & reset templates | With a local SMTP catcher (e.g. MailHog in docker-compose, dev only), activation mail arrives with a working link. Tokens never appear in logs. Env schema tests updated. |

### Wave 1: Admin backbone

| # | Phase | Scope | Acceptance criteria |
|---|---|---|---|
| **B1** | Access + directory API (B-API-25, B-API-4) | `GET /customers/:id/access`; membership list with user summary, filters, cursor pagination | Tenant admin sees names and status. Community-scoped caller sees only the subtree. A member is denied (after F1). Tenant isolation e2e extended. |
| **B2** | Admin shell & navigation | `StatefulShellRoute`, `AppShell` (drawer/rail/modal by width), top bar (customer switcher, breadcrumbs, locale, user menu), permission-aware destinations, Overview page (composed counts + next-steps checklist). Existing pages mounted inside the shell. | All existing routes reachable inside the shell. Nav hides items without permission (fake client test). Keyboard navigable. Works at 1440, 1024, and 768 widths. |
| **B3** | Platform onboarding API (B-API-1/2/3) | `initialAdmin` on `POST /customers`; `GET /platform/customers`; admin invite/resend; structured log events | e2e: platform admin creates "Tzu Chi Malaysia" with an admin email → tenant, roles, membership, and tenant_admin exist; activation sent; the new admin activates and logs in to see the customer. A non-platform user gets 403. A platform admin still cannot read tenant data without membership. |
| **B4** | Platform console UI | Customer list, 3-step create wizard, customer detail (admins, status, resend) | Widget tests: wizard validation, success screen, resend. Hidden for non-platform users. en/zh strings. |
| **B5** | Community tree UI | `TreeListView`, add child, rename, move (cycle error surfaced), deactivate | Tree builds from a flat list of any depth. Cycle error shows a localized message. Tests with a 4-level fake tree. |
| **B6** | Invite & import APIs (B-API-6/7/8) | Single invite, admin resend, `communityPath` import field | e2e: invite by email creates a pending member, invite again is idempotent, resend works, an import with `communityPath` resolves nodes and an unknown path gives a row error. A community-scoped caller can invite only into the subtree. |
| **B7** | People UI | Member directory (`AppDataTable`, search, filters), member detail (roles, community, status), invite dialog, deactivate/reactivate, role assign/unassign, roles list (+ custom role editor if time allows) | Last-admin guard message shown. Pending filter works. Masking per Q1. Tests cover invite + role assign. |
| **B8** | Import wizard UI | `WizardStepper` over the existing pipeline, template CSV download, community picker, `communityPath` mapping, error CSV download, history | Full happy path and invalid-row path pass in widget tests with the fake client. |
| **B9** | Leader scoping + safe role assignment (B-API-24) | Subtree filters, role-assignment guard, seeded `community_leader` role | e2e: a leader on node A sees participants/submissions only in A's subtree, cannot see B, and cannot assign `tenant_admin`. A tenant admin is unaffected. *(Gated by Q1.)* |

### Wave 2: Campaign operations

| # | Phase | Scope | Acceptance criteria |
|---|---|---|---|
| **C1** | Campaign API support (B-API-11, B-API-22 choice labels, B-API-12 if Q6) | Strategy catalog endpoint; localized choice label/description via translations; optional safe post-publish PATCH | `GET /campaign-rule-strategies` lists `vegetarian` with recommended `days`/`meals` definitions. `commitment-options` returns `label` per `Accept-Language` (en/zh-Hans). No vegetarian strings in generic modules. |
| **C2** | Campaign list + wizard + lifecycle UI | Campaign workspace with tabs; 6-step wizard; action definitions editor; publish checklist; publish/start/**complete** confirms | Can create 速素数数 end-to-end in the UI against the fake client: draft → publish → start → complete. Draft-only fields locked after publish. No free-text `rulesStrategy`. |
| **C3** | Participants & submissions API (B-API-10, B-API-13, B-API-14) | Enriched paginated participants; submission queue; bulk review | e2e: filters work, no completion sort, subtree respected for leaders (after B9), bulk returns per-row results, progress recomputes after reject. |
| **C4** | Participants + Review UI | Participants table + detail drawer, withdraw/enroll; Review queue (manual + spot-check) with note & bulk | Widget tests for approve/reject/bulk. Rejected rows show the note. Status chips use icon + text. |
| **C5** | Milestones + Impact + Visualization UI | Milestone CRUD/evaluate/history; measurement definitions; factor versions (source required, immutable notice); TREE settings | Evaluate shows a confirm and appends history. Creating a new factor version shows the previous one closed (from the API response). |
| **C6** | Dashboards + Reports UI | Campaign/community dashboard with community picker, day/week, `TimeSeriesChart`, TREE; reports + CSV export | Export downloads CSV (web). No personal data on aggregate screens. Charts have text alternatives. |

### Wave 3: Member mobile app

| # | Phase | Scope | Acceptance criteria |
|---|---|---|---|
| **M1** | Mobile shell | `AppShell` bottom bar (Today/Campaigns/Me), first-run language picker, customer resolution/picker, notifications bell + unread badge | Tab state preserved. Language persists. Works at text scale 2.0 without overflow (widget test). |
| **M2** | Onboarding & auth polish | Welcome cards, login/activate/reset restyle, error states, "not linked to an organisation" state | All auth widget tests pass. No enumeration hints in copy. |
| **M3** | Discover, join, pledge | Campaign list/detail, join, `ChoiceCard` pledge with localized labels, prefilled targets, 已全素 duration display, change pledge, withdraw | Pledge flow tests for 一周素 (7 days) and 已全素 (campaign duration). Choices come from the API only. |
| **M4** | Today + record | Today cards (day toggle / meals selector), undo, `CampaignCalendar` backfill, duplicate (409) handling, rejected display, stable idempotency key per attempt | Recording twice for the same day shows "Already recorded" without a crash. A cancel then re-record works. A future day is disabled. Tests use the fake client. |
| **M5** | Progress + community | Personal progress (uncapped, status labels), outcomes with source, personal TREE; community subtree + campaign aggregate + chart + TREE | 120% renders as "Exceeded". No ranks or lists of people anywhere. Semantics labels on TREE/progress. |
| **M6** | Notifications, Me, privacy, deletion | Inbox + deep links; preferences; language/timezone; privacy explainer; withdraw; logout; display name (B-API-19); account deletion (B-API-23, small API + UI) | Deletion revokes the session and anonymizes the profile (e2e). Aggregates are unchanged after deletion (test). Preferences round-trip. |

### Wave 4: Governance

| # | Phase | Scope | Acceptance criteria |
|---|---|---|---|
| **G1** | Audit log (B-API-20) | `audit_logs` migration, writer service, hooks in sensitive operations, `GET /audit-logs`, admin Audit page with filters | Each listed operation writes exactly one row without secrets or contact PII. Tenant isolation e2e. UI filters by actor/action/date. |
| **G2** | Settings + templates | Customer settings (name, active, default locale/timezone via B-API-18), read-only notification template viewer, admin "My profile" | Defaults are used by invites and the campaign wizard. Template viewer shows en and zh-Hans side by side. |

**LATER backlog:** push notifications (FCM/APNs), tags, tenant branding, broadcast announcements, privacy sharing levels (GROUP/COMMUNITY/…), native Google/Apple SDKs, template editing, review-row resolution UI (if not done), duplicate campaign, audit export, dark mode.

**Suggested critical path to a real Tzu Chi pilot:** F1 → F2 → F3 → F4 → B1 → B2 → B3 → B4 → B6 → B7 → B8 → C1 → C2 → C6 → M1 → M3 → M4 → M5. Leaders (B9, scoped C3/C4) and G1 follow right after, or come before the pilot if leaders must use the admin.

---

## 8. Open questions (need your decision)

| # | Question | Recommended default |
|---|---|---|
| **Q1** | **Community leaders:** do they get admin-web access in the MVP, and what can they see? | Yes, after B9. Leaders see member **names and activation status** in their subtree, review submissions, and see subtree dashboards/reports. They can export aggregate CSV for their subtree. They **do not** see email/mobile (masked), cannot assign roles, and cannot change campaigns. |
| **Q2** | Approve tightening the `member` role (F1)? This is an authorization-semantics change, which is on the escalation list. | Approve. Members keep self-scoped and aggregate reads and lose `memberships.read`, `roles.read`, and `user_imports.read`. |
| **Q3** | How should tenant content (campaign name/description, TREE name 素心树, choice descriptions) be bilingual, given the rule "no name_en/name_zh fields"? | Author tenant content once (zh-Hans primary for 速素数数) and allow an optional English override stored in `translations` (tenant namespace). Vegetarian choice labels/descriptions ship as platform translations in the vegetarian namespace. |
| **Q4** | Self-registration in the mobile app? | **Off** for MVP. Members join only by admin invite or CSV import. Revisit with a "join code" for open campaigns later. |
| **Q5** | Members with **mobile only** (no email): SMS vendor now, or let admins "copy a one-time activation link" to send via WhatsApp? Also: which email vendor/SMTP account, and which web domain for `PUBLIC_WEB_BASE_URL`? | Admin "Copy invite link" (one-time, 24 h, audit-logged, shown once) for MVP. Pick an SMS vendor later. Email stays the default channel. |
| **Q6** | After a campaign is published, what may admins still edit? Today everything is draft-only. | Allow the description and **extending** `endsOn`. Keep start date, timezone, rules, review mode, and audience locked. Use "complete + new campaign" for anything bigger. |
| **Q7** | Account deletion semantics (store requirement): what happens to a deleted member's history? | Deactivate the user, revoke tokens, and erase name/email/mobile identities. Keep actions linked to an anonymized user so community and campaign totals and the TREE do not drop (consistent with "historical actions preserved"). |
| **Q8** | Branding: one platform-branded app for all customers, or a Tzu Chi-branded build for the MVP? | One app and codebase, with the store listing/name decided by you. Theme tokens are ready for per-tenant colours/logo LATER. The MVP uses the calm blue/green palette above. |

---

## Appendix A: Files read for this plan
- **Docs:** `docs/AI_HANDOVER.md`, `docs/product/{PRODUCT_VISION,DOMAIN_MODEL,MVP_SPECIFICATION}.md`, `docs/architecture/{ARCHITECTURE,DATABASE,PROJECT_STRUCTURE}.md`, `docs/development/CURSOR_DEVELOPMENT_GUIDE.md`, `docs/api/API_SPEC.md`, `docs/release/MVP_READINESS.md`, `.cursor/rules/flutter-conventions.mdc`, `.env.example`.
- **API (`apps/api/src/modules/...`):**
  - authorization: `domain/permission-keys.ts`, `domain/role.entity.ts`, `application/authorization.service.ts`, `application/membership-scope.ts`, `application/tenant-context(.service).ts`, `presentation/roles.controller.ts`
  - customers: `presentation/customers.controller.ts`, `application/customer.service.ts`
  - memberships: `domain/membership.entity.ts`, `application/membership.service.ts`, `presentation/memberships.controller.ts`
  - communities: `domain/community-node.entity.ts`, `application/community-visibility.ts`, `presentation/communities.controller.ts`, `dto/update-community.dto.ts`
  - user-imports: `application/{import-mapping,user-import.service,user-import.mapper}.ts`, `presentation/user-imports.controller.ts`
  - other modules: `identity/domain/user.entity.ts`, `participation/application/participation.service.ts`, `actions/{domain/action.entity.ts, presentation/submissions.controller.ts, presentation/campaign-actions.controller.ts}`, `campaigns/{domain/campaign.entity.ts, dto/update-campaign.dto.ts}`, `vegetarian/application/vegetarian-rules.ts`, `notifications/presentation/notifications.controller.ts`, `localization/presentation/locales.controller.ts`, `auth/presentation/me.controller.ts`
  - outside `modules/`: `platform/notifications/outbound-transports.ts`, `config/configuration.ts`, `scripts/seed-founding-campaign.ts`, `test/user-imports.e2e-spec.ts`
- **Flutter admin:** `app.dart`, `pubspec.yaml`, `routing/app_router.dart`, `auth/{login_page,setup_admin_page}.dart`, `customers/*`, `communities/community_list_page.dart`, `campaigns/{campaign_form_page,campaign_admin_page,participants_page,submissions_page}.dart`.
- **Flutter mobile:** `main.dart`, `app.dart`, `pubspec.yaml`, `routing/app_router.dart`, `session/session_controller.dart`, `campaigns/{campaign_list_page,campaign_detail_page,pledge_page,record_action_page}.dart`.
- **Shared:** `packages/api_client/lib/src/{campaign_api.dart, token_store.dart}`.

Statements marked "appears" (G5) are inferred from code paths and should be confirmed by the F1 e2e tests.

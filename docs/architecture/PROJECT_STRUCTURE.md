# Project Structure
```text
community-campaign-platform/
├── apps/
│   ├── api/
│   ├── mobile/
│   └── admin/
├── packages/
│   ├── api-contracts/
│   ├── api_client/
│   └── tooling/
├── docs/
├── infrastructure/
├── .cursor/rules/
├── .github/workflows/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

Backend:
```text
apps/api/src/
├── main.ts
├── app.module.ts
├── bootstrap/
├── config/
├── modules/
│   ├── identity/
│   ├── customers/
│   ├── communities/
│   ├── memberships/
│   ├── authorization/
│   ├── user-imports/
│   ├── campaigns/
│   ├── participation/
│   ├── actions/
│   ├── commitments/
│   ├── goals/
│   ├── progress/
│   ├── milestones/
│   ├── measurements/
│   ├── outcomes/
│   ├── visualizations/
│   ├── notifications/
│   ├── localization/
│   └── audit/
├── platform/
└── shared/
```

Implemented modules may use domain/application/infrastructure/presentation.
Do not create empty future modules just to fill the tree.
`.cursor/rules`: project-baseline, backend-architecture, database-conventions, api-conventions, flutter-conventions.

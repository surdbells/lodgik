# Lodgik API Documentation

**Base URL:** `https://api.lodgik.co/api`  
**Spec:** [openapi.yaml](./openapi.yaml) — OpenAPI 3.0.3

---

## Viewing the Docs

Import `openapi.yaml` into any of these tools:

| Tool | How |
|---|---|
| **Swagger UI** | `docker run -p 8080:8080 -e SWAGGER_JSON=/docs/openapi.yaml -v $(pwd):/docs swaggerapi/swagger-ui` |
| **Redoc** | `docker run -p 8080:80 -v $(pwd):/usr/share/nginx/html/docs -e SPEC_URL=docs/openapi.yaml redocly/redoc` |
| **Postman** | Import → OpenAPI → select openapi.yaml |
| **Insomnia** | Import → From File → select openapi.yaml |
| **VS Code** | OpenAPI (Swagger) Editor extension |

---

## Authentication

All endpoints (except `/auth/login` and `/health`) require:

```
Authorization: Bearer <token>
```

Obtain a token via `POST /api/auth/login`.

---

## Response Envelope

Every response follows this structure:

```json
{
  "success": true,
  "message": "Optional human-readable message",
  "data": {}
}
```

Error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "field_name": "Error description"
  }
}
```

---

## Monetary Values

All amounts are in **kobo** (integer).  
`1 NGN = 100 kobo`

| Stored | Display |
|---|---|
| `150000` | ₦1,500.00 |
| `500` | ₦5.00 |

---

## Multi-Tenancy

`tenant_id` is resolved from the JWT on every request.  
Never pass it in the request body. Cross-tenant access is blocked at middleware level.

---

## Modules Covered

| Module | Path Prefix | Key Roles |
|---|---|---|
| Auth | `/auth` | public |
| Rooms | `/room-types`, `/rooms` | property_admin, manager |
| Amenities | `/amenities` | property_admin, manager |
| Bookings | `/bookings` | property_admin, manager, front_desk |
| Folios | `/folios` | property_admin, manager, front_desk, accountant |
| Invoices | `/invoices` | property_admin, manager, accountant |
| Finance / Expenses | `/expenses` | property_admin, manager, accountant |
| Night Audit | `/night-audit` | property_admin, manager, accountant |
| Police Reports | `/police-reports` | property_admin, manager, front_desk, security |
| Analytics | `/analytics` | property_admin, manager, accountant |
| Dashboard | `/dashboard` | property_admin, manager |
| POS | `/pos` | property_admin, manager, bar, kitchen, front_desk |
| Housekeeping | `/housekeeping` | property_admin, manager, housekeeping, front_desk |
| Service Requests | `/service-requests` | property_admin, manager, front_desk, housekeeping |
| Chat | `/chat` | property_admin, manager, front_desk, concierge |
| Notifications | `/notifications` | all authenticated |
| Security | `/security` | property_admin, manager, security, front_desk |
| Room Controls | `/room-controls` | property_admin, manager, housekeeping, front_desk |
| IoT | `/iot` | property_admin, manager, engineer |
| Guest Services | `/guest-services` | property_admin, manager, front_desk, concierge |
| Loyalty | `/loyalty` | property_admin, manager, front_desk, concierge |
| OTA | `/ota` | property_admin, manager |
| WhatsApp | `/whatsapp` | property_admin, manager, front_desk, concierge |
| Gym | `/gym` | property_admin, manager, gym_staff, front_desk |
| Spa | `/spa` | property_admin, manager, concierge, front_desk |
| HR — Employees | `/departments`, `/employees` | property_admin, manager, hr |
| HR — Attendance | `/shifts` | property_admin, manager, hr, front_desk |
| HR — Leave | `/leave-types` | property_admin, manager, hr |
| HR — Payroll | `/payroll` | property_admin, hr |
| Assets | `/assets` | property_admin, manager, engineer, maintenance |
| Audit Logs | `/admin/audit-logs` | super_admin, property_admin, manager |
| Settings | `/admin/settings` | super_admin |
| Merchants (Admin) | `/admin/merchants` | super_admin |

---

## Known Limitations / Partially Implemented

| Area | Status | Notes |
|---|---|---|
| Analytics demographics | Partial | `age_groups` always empty — requires guest DOB capture |
| OTA channels | Partial | Channel sync is simulated; real OTA webhooks not yet integrated |
| IoT | Partial | Device control API documented; physical device integration property-specific |
| Staff reset password | Implemented | Uses inline modal — no email delivery yet |

---

## Changelog

| Date | Change |
|---|---|
| 2026-03-01 | Initial OpenAPI 3.0 spec created |
| 2026-03-01 | Added amenity PUT/DELETE routes |
| 2026-03-01 | Added POS table PUT/DELETE routes |
| 2026-03-01 | Fixed analytics booking source and demographics key names |
| 2026-03-01 | Fixed FinanceService folio field reference (balance vs outstandingBalance) |

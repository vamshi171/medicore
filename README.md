# ✚ MediCore — Healthcare Management System

A full-stack **Java microservices** healthcare platform: patients find doctors and book appointments, doctors manage their schedule and raise transfusion requests, admins govern users and view statistics, a **blood bank officer** runs inventory and donor cool-down, and a **transplant coordinator** drives pledges, the waiting list and ABO-aware allocations — with **JWT security, OpenFeign inter-service calls, Resilience4j circuit breakers, async notifications, and a React (ES6+) frontend**.

Three domains, five roles: `PATIENT`, `DOCTOR`, `ADMIN`, `BLOOD_BANK_OFFICER`, `TRANSPLANT_COORDINATOR`.

## 📦 Microservice repositories

Every service also lives as a **standalone, independently buildable repo** (own POM, Dockerfile, CI, README):

| Repo | Port |
|---|---|
| [medicore-common](https://github.com/Vamshikrishna720/medicore-common) — shared JWT/ApiResponse library | — |
| [medicore-service-registry](https://github.com/Vamshikrishna720/medicore-service-registry) — Eureka | 8761 |
| [medicore-api-gateway](https://github.com/Vamshikrishna720/medicore-api-gateway) — Spring Cloud Gateway | 8080 |
| [medicore-auth-service](https://github.com/Vamshikrishna720/medicore-auth-service) — JWT, BCrypt, deactivation | 8081 |
| [medicore-patient-service](https://github.com/Vamshikrishna720/medicore-patient-service) — profiles | 8082 |
| [medicore-doctor-service](https://github.com/Vamshikrishna720/medicore-doctor-service) — search, availability | 8083 |
| [medicore-appointment-service](https://github.com/Vamshikrishna720/medicore-appointment-service) — Feign + Resilience4j booking | 8084 |
| [medicore-notification-service](https://github.com/Vamshikrishna720/medicore-notification-service) — async notifications | 8085 |
| medicore-bloodbank-service — inventory, requests, donor cool-down (standalone folder in `medicore-repos/`) | 8086 |
| medicore-organ-donation-service — pledges, waitlist, ABO matching engine (standalone folder in `medicore-repos/`) | 8087 |
| [medicore-frontend](https://github.com/Vamshikrishna720/medicore-frontend) — React 18 SPA | 3000 |

> Standalone service repos resolve `com.medicore:medicore-common:1.0.0` from the local Maven repo — run `mvn install` in medicore-common first (or publish to GitHub Packages).

> Built as a portfolio/interview project demonstrating a production-shaped architecture: API Gateway, service discovery, database-per-service, soft-delete compliance patterns, and event-driven notifications.

---

## 1. Architecture

```
                        React SPA (React 18, ES6+, plain CSS3)
                                   │ HTTP /api
                     ┌─────────────▼──────────────┐
                     │   API GATEWAY  :8080       │  Spring Cloud Gateway
                     │  • JWT validation          │  • X-User-* header forwarding
                     │  • Role-based route rules  │  • CORS
                     └─────────────┬──────────────┘
                                   │ load-balanced (Eureka)
        ┌──────────────┬───────────┼───────────────┬───────────────┐
┌───────▼──────┐ ┌─────▼─────┐ ┌───▼──────────┐ ┌──▼────────────┐ ┌▼────────────────┐
│ AUTH  :8081  │ │ PATIENT   │ │ DOCTOR :8083 │ │ APPOINTMENT   │ │ NOTIFICATION    │
│ users, JWT   │ │ :8082     │ │ profiles,    │ │ :8084         │ │ :8085           │
│ BCrypt,      │ │ profiles  │ │ search,      │ │ booking engine│ │ @Async ingest + │
│ deactivation │ │           │ │ availability │ │ OpenFeign +   │ │ simulated email │
│              │ │           │ │              │ │ Resilience4j  │ │                 │
└──────┬───────┘ └─────┬─────┘ └───┬──────────┘ └──┬────────────┘ └┬────────────────┘
       │               │           │               │               │
┌──────▼────────┐ ┌────▼──────────────────┐
│ BLOODBANK     │ │ ORGAN-DONATION        │  (same gateway/registry contract)
│ :8086         │ │ :8087                 │
│ BloodInventory│ │ OrganDonor (pledges),  │
│ BloodRequest  │ │ WaitlistEntry,        │
│ BloodDonor    │ │ MatchRecord           │
│ (90-day       │ │ OrganCompatibility-   │
│  cool-down)   │ │ Service (ABO engine)  │
└──────┬────────┘ └────┬──────────────────┘
       │               │
   medicore_auth  medicore_…   medicore_…    medicore_appointments  medicore_notifications
   medicore_bloodbank                            medicore_organs
       └───────────────┴───────────┴───── MySQL 8 (database-per-service) ─────┘

  SERVICE-REGISTRY :8761 — Netflix Eureka discovery server
  medicore-common — shared library: JwtService, filters, ApiResponse<T>, exception advice
```

**The booking flow (the demo's centerpiece):**
`POST /api/appointments` → gateway validates JWT + role → appointment-service resolves the doctor via **OpenFeign** (Eureka load-balanced), the patient via Feign, rejects deactivated accounts, checks the 30-minute slot against the doctor's availability window and overlapping bookings (**JPQL range query on a composite index**), saves inside a `@Transactional` method guarded by **`@Version` optimistic locking**, then publishes an **AFTER_COMMIT event** that triggers an **`@Async`** Feign call to notification-service — a slow/failed email can never fail or roll back a booking.

---

## 2. Services & ports

| Service | Port | Tech highlights |
|---|---|---|
| api-gateway | 8080 | Spring Cloud Gateway, per-route JWT + role filters, CORS |
| auth-service | 8081 | Spring Security, BCrypt, jjwt issuing, deactivation (soft delete) |
| patient-service | 8082 | JPA/Hibernate, pagination, internal Feign endpoint |
| doctor-service | 8083 | JPQL dynamic search w/ index on specialization, availability toggle |
| appointment-service | 8084 | OpenFeign + Resilience4j (circuit breaker, retry, timelimiter), `@Transactional`, `@Version`, `@Async`, Streams API stats |
| notification-service | 8085 | Internal ingest, async simulated email (QUEUED→SENT/FAILED) |
| bloodbank-service | 8086 | Stock lots with expiry + usable-unit threshold, request workflow (REQUESTED→APPROVED→FULFILLED/REJECTED/CANCELLED), donor registry with a 90-day cool-down |
| organ-donation-service | 8087 | Pledges with per-organ consent, waiting list with urgency, pure `OrganCompatibilityService` (ABO organ rules + immune-privileged tissue, ranked candidate list), coordinator-only allocation |
| service-registry | 8761 | Eureka server |
| medicore-frontend | 5173 (dev) / 3000 (docker) | React 18, Vite, axios interceptors, Context API, role-guarded routes |

**Swagger UI** (each service): `http://localhost:{port}/swagger-ui/index.html`

---

## 3. Quick start

### Option A — Docker (recommended)

Prereqs: Docker Desktop. Jars are built inside CI normally; locally build them once first (the backend Dockerfiles run prebuilt jars):

```bash
cd projects/medicore
mvn -DskipTests clean package          # build all jars
docker compose up --build              # MySQL + 7 services + frontend
```

Open **http://localhost:3000** (React via Nginx → proxies /api to the gateway).

### Option B — Local dev

Prereqs: JDK 17, Maven, Node 18+, MySQL 8 running locally with a `medicore` user (`medicore`/`medicore123`) — or just run the compose MySQL: `docker compose up mysql`.

```bash
# 1. shared module + services (8 terminals, or run one by one)
mvn clean install -DskipTests
mvn spring-boot:run -pl service-registry
mvn spring-boot:run -pl api-gateway
mvn spring-boot:run -pl auth-service
mvn spring-boot:run -pl patient-service
mvn spring-boot:run -pl doctor-service
mvn spring-boot:run -pl appointment-service
mvn spring-boot:run -pl notification-service
mvn spring-boot:run -pl bloodbank-service
mvn spring-boot:run -pl organ-donation-service

# 2. frontend
cd medicore-frontend && npm install && npm run dev   # http://localhost:5173
```

### Demo accounts (auto-seeded)

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@medicore.com | Admin@123 |
| DOCTOR | doctor@medicore.com | Doctor@123 |
| PATIENT | patient@medicore.com | Patient@123 |
| BLOOD_BANK_OFFICER | bloodbank@medicore.com | Bloodbank@123 |
| TRANSPLANT_COORDINATOR | coordinator@medicore.com | Coordinator@123 |

> First flow to try: login as doctor → create profile → login as patient (register a new one) → find doctors → book 10:00 or 10:30-style slot → doctor confirms → patient sees notification.

### Tests

```bash
mvn test                       # JUnit 5 + Mockito unit tests (auth, appointment, common JWT)
npm run build                  # frontend build check

# end-to-end role gate for the two new domains (needs the full stack up):
bash ../_tools/verify-domains.sh   # 75 assertions: role matrix, ownership, ABO rules, stock decrement
```

### Postman

Import `postman/MediCore.postman_collection.json` → run **Auth → Login** first (auto-captures the JWT into a collection variable) → everything else is pre-wired.

---

## 4. API surface (via gateway, all `/api/...`)

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | /auth/register, /auth/login | public | register (PATIENT/DOCTOR), login → JWT |
| GET | /auth/me | any | current user |
| DELETE | /auth/me | any | self-deactivation (soft delete) |
| GET | /auth/users?search= | ADMIN | paginated user search |
| PATCH | /auth/users/{id}/status | ADMIN | activate/deactivate account |
| POST/GET/PUT | /patients/me | PATIENT | profile CRUD |
| GET | /patients, /patients/{id} | ADMIN | list/detail |
| GET | /doctors, /doctors/{id}, /doctors/specializations | public | search + filters (spec/exp/fee) |
| POST/GET/PUT | /doctors/me | DOCTOR | profile CRUD |
| PATCH | /doctors/me/availability?available= | DOCTOR | on/off-duty toggle |
| POST | /appointments | PATIENT | book (validates both accounts active, slot window, overlap) |
| GET | /appointments/me/patient, /me/doctor | PATIENT/DOCTOR | my appointments |
| PATCH | /appointments/{id}/cancel, /{id}/status?status= | mixed | cancel; doctor confirm/complete |
| GET | /appointments/stats | ADMIN | Streams-computed statistics |
| GET | /notifications | any | my notifications |
| GET | /bloodbank/metadata, /bloodbank/stats | mixed | reference data; stock statistics |
| GET | /bloodbank/availability | any domain role | public stock search (group + component + city) |
| GET | /bloodbank/compatibility/{bloodGroup} | any domain role | who this group can receive from / donate to |
| GET | /bloodbank/inventory, /bloodbank/inventory/expiring | OFFICER, ADMIN | full lots incl. thresholds and expiry |
| POST/PUT/DELETE | /bloodbank/inventory, /{id}, /{id}/adjust | OFFICER, ADMIN | stock lots: record, edit, adjust, remove |
| GET | /bloodbank/donors | OFFICER, ADMIN | donor registry (group/city/eligibility filters, cool-down) |
| PATCH | /bloodbank/donors/{id}/eligibility | OFFICER, ADMIN | defer / re-activate a donor |
| POST | /bloodbank/requests | PATIENT, DOCTOR | raise a transfusion request |
| GET | /bloodbank/requests/mine, /bloodbank/requests, /{id} | owner vs OFFICER/ADMIN | own requests (403 on someone else's) vs the full board |
| POST | /bloodbank/requests/{id}/decision | OFFICER, ADMIN | APPROVED / REJECTED / FULFILLED (fulfilment issues stock FIFO and decrements usable units) |
| PATCH | /bloodbank/requests/{id}/cancel | owner | withdraw an open request |
| POST/GET/PUT | /bloodbank/donors/me | PATIENT | register (201) / read / update own donor profile (90-day cool-down enforced) |
| GET | /organs/metadata, /organs/stats | mixed | organ + blood-group reference data; domain statistics |
| POST/GET/PUT | /organs/pledges/me | PATIENT | pledge (multi-organ + consent flags), read, update |
| PATCH | /organs/pledges/me/revoke | PATIENT | withdraw consent |
| GET | /organs/pledges, /organs/pledges/{id} | COORDINATOR, ADMIN | pledge registry |
| PATCH | /organs/pledges/{id}/verify | COORDINATOR | verify / revoke a pledge |
| POST | /organs/waitlist | DOCTOR, COORDINATOR | list a patient |
| GET | /organs/waitlist/mine, /organs/waitlist, /{id} | owner vs staff | own entries vs the filtered waiting list |
| PATCH | /organs/waitlist/{id}/status | COORDINATOR, ADMIN | MATCHED / TRANSPLANTED / REMOVED |
| GET | /organs/waitlist/{id}/candidates | COORDINATOR, ADMIN | ranked ABO-checked donors — the engine never offers an incompatible pair |
| POST | /organs/matches | COORDINATOR | propose an allocation (rejects an incompatible pair with 400) |
| PATCH | /organs/matches/{id}/status | COORDINATOR | CONFIRMED / COMPLETED / WITHDRAWN (withdraw returns the recipient to the waiting list) |
| GET | /organs/matches/mine, /organs/matches | participant vs COORDINATOR/ADMIN | own allocations vs the allocation book |

Every response uses the shared envelope `ApiResponse<T> { success, message, data, timestamp }`; lists use `PageResponse<T>`.

---

## 5. Account deactivation design (soft delete)

- Users, patients, doctors are **never hard-deleted** — `active=false` + `deactivatedAt`. Healthcare history retention is a compliance expectation (HIPAA-style thinking), and it makes deactivation **reversible**.
- **Login gate:** deactivated accounts cannot authenticate.
- **Booking gate:** even with a live JWT (tokens can't be revoked client-side), appointment-service re-checks account status over Feign before booking — so deactivated doctors/patients get no *new* bookings. (Documented trade-off: existing JWTs remain valid until expiry; a production system would add a token blacklist/short TTL.)
- **Doctor availability** is a separate on/off-duty toggle — going off duty hides a doctor from search without touching account status.
- **ADMIN controls:** activate/deactivate anyone from the admin UI.

---

## 6. Tech stack — used vs not used

| Required item | Status | Where |
|---|---|---|
| Java (8+) | ✅ Java 17 (LTS, satisfies "8+") | all services |
| Spring Boot / MVC / Data JPA / Hibernate | ✅ | all services |
| Spring Security + JWT | ✅ | auth (issue, BCrypt), gateway (validate), common filter (verify) |
| REST APIs | ✅ | documented above, Swagger on every service |
| Core Java: OOP, Collections, Generics, Multithreading, Lambdas, Streams, Exception handling | ✅ | entities+inheritance & records, `ApiResponse<T>`/`PageResponse<T>`, ThreadPoolTaskExecutor + `@Async`, lambdas/method refs, Streams `groupingBy/counting`, `@RestControllerAdvice` |
| MySQL, SQL, query optimization, indexing, transactions | ✅ | 7 schemas, JPQL overlap query, composite index `(doctor_id, appointment_date)`, unique + search indexes, `@Transactional` + `@Version` |
| Microservices, API Gateway, OpenFeign, Resilience4j | ✅ | Eureka, Spring Cloud Gateway, Feign clients with fallback factories, CB/retry/timelimiter config |
| React.js, JavaScript ES6+, HTML5, CSS3 | ✅ | React 18 + Vite, hooks/Context, hand-written responsive CSS, zero UI libraries |
| AWS fundamentals | ⚠️ Fundamentals only | deploy notes below — no live AWS infra in this repo |
| CI/CD concepts | ✅ | `.github/workflows/ci.yml` (Maven verify → React build → Docker images) |
| Docker fundamentals | ✅ | Dockerfile per unit, full `docker-compose.yml` |
| Git / Maven / Postman / Swagger | ✅ | repo layout, parent POM multi-module, Postman collection, springdoc |
| JUnit 5, Mockito, unit/integration testing | ✅ | JwtServiceTest, AuthServiceTest, AppointmentServiceTest (unit); MockMvc-style service tests via mocked MVC layer in AppointmentServiceTest |
| **JDBC (raw)** | ❌ Not used | Spring Data JPA + Hibernate chosen (industry standard); JDBC concepts (transactions, indexing, SQL) still applied at the JPA/SQL level |
| **Apache Tomcat (standalone)** | ❌ Not used | embedded Tomcat inside Boot jars — standalone Tomcat/WAR deployment isn't used in cloud-native microservices |
| **Eclipse / VS Code** | — | IDEs, not project code — use either |
| Redux / TypeScript / Tailwind / Bootstrap | ❌ Not used | stack specifies React + ES6 + plain CSS3 |
| Kafka / RabbitMQ | ❌ Not used | Feign + Spring events (`@TransactionalEventListener(AFTER_COMMIT)`) instead — a real system would use a message broker; noted as the known simplification |
| GraphQL / gRPC | ❌ Not used | REST only, per stack |
| Kubernetes / EKS runtime | ❌ Not used | Docker Compose orchestration; K8s is the natural next step |
| Actual cloud deployment | ❌ Not used | AWS path documented below |

## 7. AWS deployment path (fundamentals)

1. **ECR** — push the 8 built images.
2. **RDS MySQL** (Multi-AZ) replaces the compose MySQL; set `DB_HOST`, credentials as secrets.
3. Services on **ECS Fargate** (or **Elastic Beanstalk** Docker) — one task definition per service; `EUREKA_URI` points at the registry service; peer-awareness via ECS service discovery.
4. **ALB** in front of api-gateway (8080) with ACM TLS; frontend served from **S3 + CloudFront**.
5. Secrets (JWT_SECRET, INTERNAL_TOKEN, DB creds) in **Secrets Manager/SSM**; logs to **CloudWatch**; alarms on circuit-breaker open-state metrics.

---

## 8. Interview talking points

- **Why database-per-service?** Independent schemas/ownership; no cross-service joins; appointment rows denormalize doctor/patient names deliberately (read-optimized snapshots).
- **Double-booking prevention:** 30-minute grid + JPQL overlap query on `(doctor_id, appointment_date)` index + `@Version` optimistic locking as a second line of defense under concurrent commits.
- **JWT flow end-to-end:** signed at auth (HS256, claims `userId/role`), verified at the gateway, re-verified per service by the shared filter (defense in depth), identity forwarded as `X-User-*` headers; internal `/internal/**` endpoints use a separate shared-secret token so browsers can't call them directly.
- **Circuit breaker behavior:** if doctor-service dies, the breaker opens after 50% failures over a 10-call window, fails fast with a friendly 503 (`ServiceUnavailableException`), half-opens after 10 s with 3 probe calls.
- **Why AFTER_COMMIT events?** Notifications must reflect committed state and never jeopardize the booking transaction; `@Async` keeps the HTTP thread free.
- **Deactivation as soft delete** — reversibility + record retention compliance.

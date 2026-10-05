# MediCore — Run Guide (Antigravity, Cursor, VS Code, IntelliJ — any IDE)

The full project lives in the **`projects/`** folder:

```
projects/
├── medicore/                  ← THE WHOLE PROJECT (open this folder in your IDE)
│   ├── api-gateway/             Spring Cloud Gateway   (:8080)
│   ├── auth-service/            JWT / login            (:9081 locally)
│   ├── patient-service/         patient profiles       (:8082)
│   ├── doctor-service/          doctor search          (:8083)
│   ├── appointment-service/     booking engine         (:8084)
│   ├── notification-service/    async notifications    (:8085)
│   ├── service-registry/        Eureka                 (:8761)
│   ├── medicore-common/         shared library (no main class)
│   ├── medicore-frontend/       React 18 + Vite        (:5173 or next free port)
│   └── pom.xml                  parent Maven build
└── _tools/                    portable JDK 17 + Maven + MySQL 8 (no system install needed)
```

## 📂 Which folder to open in your IDE

> **Open `projects/medicore`** — that is the whole project.
> (`projects/_tools` is just the local toolchain; `projects/medicore-repos` is the copy of the same services as separate GitHub repos.)

---

## 🚀 Fast way (2 terminals — recommended)

**Prerequisite:** the portable toolchain in `projects/_tools/` already exists on this machine. JDK 17, Maven and MySQL 8 need no installation.

### Terminal 1 — backend (one command, starts everything)

```bash
# Git Bash terminal, from anywhere:
bash <path-to-projects>/_tools/run-backend.sh
```

Example on this machine:

```bash
bash "C:/Users/2531050/Saved Games/bmp/aws-crash-course/projects/_tools/run-backend.sh"
```

Wait until you see **`ALL BACKEND SERVICES HEALTHY`**.

What it starts, in order: MySQL → Eureka → auth → patient → doctor → appointment → notification → gateway. It is idempotent — running it again skips anything already up.

### Terminal 2 — frontend

```bash
cd <path-to-projects>/medicore/medicore-frontend
npm install        # only the first time (skip if node_modules exists)
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173, or 5188 if 5173 is busy).

### Stop everything

```bash
bash <path-to-projects>/_tools/stop-all.sh     # kills only MediCore services + its MySQL
```
(Ctrl+C in the frontend terminal.)

---

## 🛠 Manual way (one terminal per piece — for learning/teaching)

Click **`+`** in the terminal panel for each new terminal. Use **Git Bash** (or set JAVA_HOME/Path manually on PowerShell — see below). Order matters:

| # | What | Command |
|---|---|---|
| 1 | MySQL | `bash <projects>/_tools/start-mysql.sh` |
| 2 | Eureka | `source <projects>/_tools/env.sh && cd <projects>/medicore && mvn spring-boot:run -pl service-registry` |
| 3 | Auth | `cd <projects>/medicore && source ../_tools/env.sh && mvn spring-boot:run -pl auth-service -Dspring-boot.run.arguments=--server.port=9081` |
| 4 | Patient | `source ../_tools/env.sh && mvn spring-boot:run -pl patient-service` |
| 5 | Doctor | `mvn spring-boot:run -pl doctor-service` |
| 6 | Appointment | `mvn spring-boot:run -pl appointment-service` |
| 7 | Notification | `mvn spring-boot:run -pl notification-service` |
| 8 | Gateway | `mvn spring-boot:run -pl api-gateway` |
| 9 | Frontend | `cd medicore-frontend && npm run dev` |

Wait for `Started <Name>Application` in each terminal before the next. `mvn spring-boot:run` compiles on the fly — no separate build step needed. **Run steps 2-8 from the `projects/medicore` folder**, and make sure step 1's `source ../_tools/env.sh` was done at least once in that shell (it puts `mvn` on PATH).

### If you prefer running the prebuilt jars (faster, no mvn at runtime)

Build once: `cd projects/medicore && source ../_tools/env.sh && mvn clean install -DskipTests` — then in any terminal:

```bash
source ../_tools/env.sh
java -jar service-registry/target/service-registry-1.0.0.jar
java -jar auth-service/target/auth-service-1.0.0.jar --server.port=9081
java -jar patient-service/target/patient-service-1.0.0.jar
java -jar doctor-service/target/doctor-service-1.0.0.jar
java -jar appointment-service/target/appointment-1.0.0.jar   # note: appointment-service-1.0.0.jar
java -jar notification-service/target/notification-service-1.0.0.jar
java -jar api-gateway/target/api-gateway-1.0.0.jar
```

---

## 💻 IDE-specific notes

### Antigravity / Cursor / VS Code
- **Terminal profile:** `Ctrl+Shift+P` → *Terminal: Select Default Profile* → **Git Bash** (all commands above are bash). Open a fresh terminal after switching.
- **Java extension:** install *Extension Pack for Java* so Maven projects are recognized; you can also run each service from the Spring Boot dashboard instead of the terminal (right-click a service → Run).
- **Everything else is the same.**

### IntelliJ IDEA (Ultimate)
- Open `projects/medicore` → it auto-imports the Maven multi-module project.
- Run configurations: each service has a `*Application` main class — just Run them in order (Eureka first).
- Set **Working directory** to the module folder and, for auth-service, add VM/program argument `--server.port=9081`.
- Maven tool window → `medicore` → Lifecycle → `install` builds everything.

### PowerShell instead of Git Bash
Put this at the top of every backend terminal (adjust the path to your `projects` folder):

```powershell
$env:JAVA_HOME="C:\Users\2531050\Saved Games\bmp\aws-crash-course\projects\_tools\downloads\jdk-17.0.20.1+1"
$env:Path="$env:JAVA_HOME\bin;C:\Users\2531050\Saved Games\bmp\aws-crash-course\projects\_tools\downloads\apache-maven-3.9.9\bin;"+$env:Path
```

Then the same `mvn spring-boot:run` / `java -jar` commands work (no `source env.sh`).

---

## 🔑 Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | admin@medicore.com | Admin@123 |
| Doctor | doctor@medicore.com | Doctor@123 |
| Patient | patient@medicore.com | Patient@123 |
| Doctor | dr.sharma@medicore.com | Sharma@123 |
| Doctor | dr.mehta@medicore.com | Mehta@123 |
| Doctor | dr.reddy@medicore.com | Reddy@123 |
| Patient | arjun@medicore.com | Arjun@123 |
| Patient | priya@medicore.com | Priya@123 |
| Patient | rahul@medicore.com | Rahul@123 |

## ✅ Health checks

| URL | Expect |
|---|---|
| http://localhost:8761 | Eureka dashboard, 6 `MEDICORE-*` apps UP |
| http://localhost:8080 | Gateway (any API response) |
| Vite URL | MediCore login page |

## 🔁 Rebuild after code changes

```bash
cd projects/medicore && source ../_tools/env.sh && mvn clean install
```
Then restart the service you changed (Ctrl+C → run again). Frontend hot-reloads automatically.

## 🐳 Docker alternative (any machine with Docker Desktop)

```bash
cd projects/medicore        # or projects/medicore-repos for the standalone compose
docker compose up --build
```

## ❓ Common issues

| Symptom | Fix |
|---|---|
| `mvn: command not found` | You didn't `source ../_tools/env.sh` (Git Bash) or set `$env:Path` (PowerShell) |
| Port 8081 already in use | Expected on this machine — auth-service uses 9081 here (`--server.port=9081`) |
| Gateway 503 right after start | Wait ~5s; the registry cache now refreshes every 5s (was 30) |
| Frontend can't reach API | Backend must be fully up first; check the gateway port in `vite.config.js` |
| `npm ci` fails | Run `npm install` instead (first time only) |

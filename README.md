# JournalApp

A secure journal application with **end-to-end encryption (E2EE)**, where the server never sees your journal plaintext.

Built with Spring Boot 3.4 + React 19 + Vite 8 + MongoDB + Redis + Kafka.

## Architecture

```
                    ┌───────────────────┐
                    │   React / Vite     │
                    │   Frontend :3000   │
                    │                    │
                    │  ┌──────────────┐  │
                    │  │ AES-256-GCM  │  │  <-- encryption happens here
                    │  │ PBKDF2 KDF   │  │
                    │  └──────────────┘  │
                    └─────────┬─────────┘
                              │
                    Google OAuth / HTTPS
                              │
                    ┌─────────▼─────────┐
                    │   Spring Boot      │
                    │   Backend :8080    │
                    └───┬─────┬─────┬───┘
                        │     │     │
               ┌────────▼┐ ┌──▼──┐ ┌▼─────────┐
               │ MongoDB │ │Redis│ │  Kafka    │
               │ Atlas   │ │     │ │  Aiven    │
               └─────────┘ │Upstash│ └────┬─────┘
                           │     │      │
                        Sentiment     Sentiment
                        Consumer      Scheduler
                           │          (weekly)
                           ▼            │
                        Resend          ▼
                        (email)      Resend
```

**What the server sees:**
```
{
  "id": "abc123",
  "userName": "alice",
  "title": "xbG3kQ==:9f2c1a...",      <-- ciphertext
  "content": "mN4pR==:k8w2x1...",     <-- ciphertext
  "sentiment": "HAPPY",               <-- label only
  "date": "2026-08-20T10:30:00"       <-- plaintext (metadata)
}
```

**What the server never sees:** Your journal title or content in plaintext.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, react-router-dom, axios |
| Backend | Spring Boot 3.4.0, Java 17 |
| Database | MongoDB (Atlas) |
| Cache | Redis (Upstash) |
| Messaging | Kafka (Aiven) |
| Auth | JWT + Google OAuth 2.0 (Spring Security) |
| E2EE | AES-256-GCM, PBKDF2 (100k iterations), SHA-256 |
| Email | Resend / Gmail SMTP |
| API Docs | SpringDoc OpenAPI (Swagger UI) |
| Testing | Node.js test runner, bash API tests |

## Local Development

### Prerequisites

- JDK 17+
- Maven 3.x
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, Upstash)
- Kafka (optional, Aiven)

### 1. Clone & configure

```bash
git clone https://github.com/govind516/journalApp.git
cd journalApp
```

### 2. Create `.env` in project root

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/journalApp
MONGODB_DATABASE=journalApp
REDIS_URL=rediss://...                          # optional
KAFKA_BOOTSTRAP_SERVERS=penguin-01.sasl...:9092  # optional
KAFKA_SASL_JAAS_CONFIG=org.apache.kafka...       # optional
KAFKA_CLIENT_ID=journal-app
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
MAIL_USERNAME=your@email.com
MAIL_PASSWORD=your-app-password
JWT_SECRET=generate-with-openssl-rand-hex-32
WEATHER_API_KEY=your-key
QUOTE_API_KEY=your-key
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Start backend

```bash
mvn spring-boot:run
```

Backend runs at `http://localhost:8080`. Swagger at `http://localhost:8080/swagger-ui/index.html`.

### 4. Start frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs at `http://localhost:3000` (proxied to backend).

### 5. Run tests

```bash
# Unit tests (crypto + sentiment)
cd client && node --experimental-vm-modules src/utils/__tests__/crypto.test.js
cd client && node --experimental-vm-modules src/utils/__tests__/sentiment.test.js

# API integration tests (requires running backend)
bash test-api.sh
```

## Cloud Deployment (Render)

### Backend

1. Push to GitHub
2. Create Web Service on Render
3. Build command: `mvn clean package -DskipTests`
4. Start command: `bash start.jar.sh`
5. Add all `.env` variables as Render environment variables

### Frontend

Deploy the `client/` directory as a separate Static Site on Render (or any static host):
```bash
cd client && npm run build
# Upload client/dist/ to static host
```

Set `VITE_API_URL=https://your-backend.onrender.com` in the frontend's environment.

## Authentication

### JWT Flow

```
POST /public/signUp  -->  creates account (password BCrypt-hashed)
POST /public/login   -->  returns JWT token
GET  /journal        -->  Authorization: Bearer <token>
```

### Google OAuth Flow

```
Browser  -->  Google consent screen
Google   -->  redirects to /auth/google/callback?code=...
Backend  -->  exchanges code for id_token
Backend  -->  finds/creates user, returns JWT
Browser  -->  stores JWT, redirects to dashboard
```

Configure Google Cloud Console redirect URIs:
- `http://localhost:3000/auth/google/callback` (dev)
- `https://your-domain.com/auth/google/callback` (prod)

### Roles

| Role | Access |
|------|--------|
| USER | `/user/**`, `/journal/**` |
| ADMIN | `/admin/**` + all USER routes |

## End-to-End Encryption (E2EE)

### Design

```
User password
    │
    ▼  PBKDF2 (100k iterations, SHA-256)
Encryption key (AES-256)
    │
    ▼  AES-256-GCM (random IV per entry)
Ciphertext
    │
    ▼
Server stores: iv:ciphertext
```

### Key Derivation

- **Salt**: Derived deterministically from username via SHA-256 (not stored)
- **KDF**: PBKDF2 with 100,000 iterations
- **Cipher**: AES-256-GCM (authenticated encryption)
- **IV**: Random 12 bytes per encryption (same plaintext → different ciphertext)

### What's Encrypted

| Data | Encrypted? | Why |
|------|-----------|-----|
| Journal title | ✅ | May contain sensitive info |
| Journal content | ✅ | Core privacy |
| Sentiment | ❌ | Computed client-side, label only |
| Date | ❌ | UI metadata |
| User email/ID | ❌ | Auth infrastructure |

### Flow

1. User enters password → cached in browser memory
2. Create entry: plaintext → encrypt → ciphertext sent to server
3. Read entry: ciphertext fetched → decrypted locally → plaintext shown
4. Logout: password cleared from memory

### Security Properties

- Server never sees journal plaintext
- Random IV per encryption (semantic security)
- PBKDF2 with 100k iterations (brute-force resistant)
- AES-GCM provides confidentiality + integrity
- Wrong password/key → decryption fails with error
- Password cleared from memory on logout

## Sentiment Analysis

Sentiment is computed **client-side** (browser) to preserve E2EE:

```
Browser: plaintext → analyzeSentiment() → HAPPY
Server: stores { sentiment: "HAPPY", title: "ciphertext..." }
```

Categories: `HAPPY`, `SAD`, `ANGRY`, `ANXIOUS`, `NEUTRAL`

Keyword-based analyzer with 400+ words across 4 categories. Runs on every keystroke for live mood preview.

## Redis Usage

- Caches external API responses (weather, quotes)
- `AppCache` loads config from MongoDB on startup
- TTL-based cache invalidation
- Falls back to direct API calls on cache miss

## Kafka Usage

- **Producer**: Sentiment scheduler produces to `weekly-sentiments` topic
- **Consumer**: `SentimentConsumerService` consumes and sends email
- **Scheduler**: `UserScheduler` runs weekly (Sunday 9 AM) to aggregate sentiments
- **Fallback**: If Kafka unavailable, sends email directly

## Database Design

### `users` collection

```json
{
  "_id": ObjectId,
  "userName": "alice",              // unique, indexed
  "email": "alice@example.com",
  "password": "$2a$10$...",         // BCrypt-hashed
  "sentimentAnalysis": false,
  "roles": ["USER"]
}
```

### `journalEntries` collection

```json
{
  "_id": ObjectId,
  "title": "xbG3kQ==:9f2c1a...",   // encrypted
  "content": "mN4pR==:k8w2x1...",  // encrypted
  "date": "2026-08-20T10:30:00",
  "sentiment": "HAPPY",            // client-computed label
  "userName": "alice"               // indexed, ownership
}
```

### `configJournalApp` collection

```json
{
  "key": "weather_api_key",
  "value": "..."
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `MONGODB_DATABASE` | ✅ | Database name |
| `REDIS_URL` | ❌ | Upstash Redis URL |
| `KAFKA_BOOTSTRAP_SERVERS` | ❌ | Aiven Kafka broker |
| `KAFKA_SASL_JAAS_CONFIG` | ❌ | Kafka SASL config |
| `KAFKA_CLIENT_ID` | ❌ | Kafka client ID |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | ❌ | OAuth redirect (default: localhost:3000) |
| `MAIL_USERNAME` | ✅ | SMTP username |
| `MAIL_PASSWORD` | ✅ | SMTP password |
| `JWT_SECRET` | ✅ | JWT signing key (use `openssl rand -hex 32`) |
| `WEATHER_API_KEY` | ✅ | WeatherStack API key |
| `QUOTE_API_KEY` | ✅ | API Ninjas quotes key |
| `CORS_ALLOWED_ORIGINS` | ❌ | Comma-separated origins (default: localhost) |
| `VITE_API_URL` | ❌ | Frontend API URL (default: localhost:8080) |
| `VITE_GOOGLE_CLIENT_ID` | ❌ | Frontend Google client ID |

## Security Model

| Layer | Protection |
|-------|-----------|
| Transport | HTTPS (Render provides TLS) |
| Authentication | JWT tokens with 30-min expiry |
| Passwords | BCrypt hashing (10 rounds) |
| Authorization | Role-based (USER/ADMIN) via Spring Security |
| CORS | Configurable allowed origins |
| Rate Limiting | 10 login attempts/IP/minute |
| Headers | X-Frame-Options: DENY, HSTS, nosniff |
| CSRF | Disabled (stateless JWT) |
| E2EE | AES-256-GCM, PBKDF2 100k iterations |
| Logs | No plaintext journal content in logs |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/public/health-check` | - | Health check |
| POST | `/public/signUp` | - | Create account |
| POST | `/public/login` | - | Login, returns JWT |
| GET | `/auth/google/callback` | - | Google OAuth callback |
| GET | `/user` | USER | Get greeting (weather + quote) |
| PUT | `/user` | USER | Update user |
| DELETE | `/user` | USER | Delete user |
| GET | `/journal` | USER | List user's entries |
| POST | `/journal` | USER | Create entry |
| GET | `/journal/id/{id}` | USER | Get entry by ID |
| PUT | `/journal/id/{id}` | USER | Update entry |
| DELETE | `/journal/id/{id}` | USER | Delete entry |
| GET | `/admin/all-users` | ADMIN | List all users |
| POST | `/admin/create-admin` | ADMIN | Create admin user |
| GET | `/admin/clear-app-cache` | ADMIN | Clear Redis cache |

## Known Limitations

- **Container sleep**: Render free tier sleeps after 15 min inactivity (5-10s cold start)
- **No Kafka on Render free**: Sentiment scheduler doesn't run; email fallback works
- **No export/import**: E2EE export/import of encrypted entries not yet implemented
- **Google login E2EE**: Google-authenticated users don't have a password for key derivation; need separate encryption passphrase
- **Sentiment accuracy**: Keyword-based; not as accurate as ML-based approaches

## License

MIT

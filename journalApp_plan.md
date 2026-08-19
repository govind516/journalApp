# JournalApp — Project Technology Recommendation

I'd personally investigate the current free-tier behavior of the backend host before committing, especially because **your Kafka consumer/scheduler makes sleeping behavior important**.

The cloud services being managed doesn't mean your Spring Boot application will stay awake forever.

---

## My final plan

This is what I would actually give your AI agent.

---

### Phase 0 — Baseline & safety

**Goal:** Don't change architecture yet.

**First:**
- Build the existing backend.
- Run all existing tests.
- Document current endpoints.
- Verify MongoDB/Redis/Kafka behavior.
- Create a known-good baseline Git commit/tag.

**Then fix:**
- hardcoded JWT secret
- plaintext password update
- `UserRepositoryImpl`
- swallowed exceptions
- JWT expiration mismatch
- `auto-index-creation`
- weather typo
- `allow-circular-references`
- error handling
- authentication tests

**Gate:** existing application still works.

---

### Phase 1 — Cloud infrastructure

Replace local infrastructure **without changing application behavior**.

**MongoDB**
```
Local MongoDB
      ↓
MongoDB Atlas
```

**Redis**
```
Local Redis
      ↓
Upstash Redis
```
You already created this.

**Kafka**
```
Local Kafka
      ↓
Aiven Kafka
```

**Email**
```
Local/dev SMTP
      ↓
Resend
```

**Result**

The backend should now be able to run against:
```
MongoDB Atlas
Upstash Redis
Aiven Kafka
Resend
```
without starting any of those locally.

**Gate:** all existing JournalApp features work against cloud infrastructure.

---

### Phase 2 — Backend deployment

Now deploy Spring Boot.

```
GitHub
   ↓
CI
   ↓
Backend hosting
   ↓
MongoDB Atlas
Upstash Redis
Aiven Kafka
Resend
```

Configure all secrets through the hosting provider's environment variables.

**Never** use these for secrets:
```
application.yml
.env committed to GitHub
source code
logs
```

**Gate:**

You can open the backend's HTTPS URL and successfully:
- register
- login
- CRUD journals
- access weather
- access quote
- trigger Kafka
- send email

---

### Phase 3 — React frontend

Now build the actual website.

I'd use: **React + Vite**

**Pages:**
```
/login
/register
/dashboard
/journal
/journal/:id
/profile
/settings
```

Don't start E2EE yet.

First make the frontend work with the existing backend.

---

### Phase 4 — Proper Google Login

Replace OAuth Playground completely.

**Desired UX:**
```
Login

[ Continue with Google ]

or

Email
Password

[ Login ]
```

**Google flow:**
```
React
  ↓
Google
  ↓
Google identity
  ↓
Spring Boot
  ↓
Find/create User
  ↓
Your application session
```

Use secure HttpOnly cookies if that's compatible with your deployment/CORS architecture.

**Gate:**

A new user can:
```
Google login
      ↓
Account created
      ↓
Dashboard
      ↓
Create journal
      ↓
Logout
      ↓
Login again
```

---

### Phase 5 — Fix the domain model

Before E2EE, clean up MongoDB.

I'd specifically ask the agent to review:
```
User
 └── @DBRef List<JournalEntry>
```

and consider:
```
User
 └── id

JournalEntry
 ├── id
 ├── userId
 ├── title
 ├── content
 ├── date
 └── sentiment
```

This makes journal ownership simpler.

Also properly implement sentiment instead of leaving:
```
sentiment = null
```
while the scheduler assumes it exists.

---

### Phase 6 — True E2EE design

**Only now.**

First create a written technical design before coding.

**Define:**

**Encryption**

For example:
```
User passphrase
      ↓
KDF
      ↓
Encryption key
      ↓
AES-GCM
      ↓
Ciphertext
```

The server stores:
```
ciphertext
IV
salt
metadata
```
and never receives the journal plaintext.

**Decide what is encrypted**

| Data            | Encrypted?       |
|-----------------|-------------------|
| Journal content | ✅                |
| Title           | ✅                |
| Sentiment       | Depends on design |
| Date            | Probably ❌       |
| User email      | ❌                |
| User ID         | ❌                |

Don't let the AI agent make these decisions silently.

---

### Phase 7 — Rebuild sentiment around E2EE

This is where your current Kafka feature becomes interesting.

**Instead of:**
```
Server
  ↓
Decrypt journal
  ↓
Sentiment
```

**do:**
```
Browser
  ↓
Decrypt journal
  ↓
Sentiment analysis
  ↓
sentiment label
  ↓
Backend
  ↓
Kafka
  ↓
Weekly aggregation
  ↓
Email
```

The server never receives the journal content.

For example:
```
Journal:
"I had an amazing day..."

Browser:
POSITIVE

Server:
{
  userId: "...",
  sentiment: "POSITIVE",
  date: "..."
}
```

Then Kafka can still do:
```
weekly-sentiments
      ↓
consumer
      ↓
aggregate
      ↓
email
```

This preserves your Kafka learning objective while maintaining the E2EE property.

---

### Phase 8 — Security hardening

After everything works:
- HttpOnly cookies
- Secure cookies
- SameSite policy
- CORS
- CSRF analysis
- rate limiting
- login throttling
- password policy
- Google OAuth validation
- JWT expiry
- secret rotation strategy
- MongoDB access rules
- Redis credentials
- Kafka credentials
- security headers
- CSP
- dependency scanning
- SonarQube
- GitHub secret scanning

Also make sure: **No journal plaintext appears in application logs.**

That's particularly important once E2EE exists.

---

### Phase 9 — Production testing

Test the actual deployed application.

**Authentication**
- Register
- Login
- Google login
- Logout
- expired JWT
- invalid JWT
- wrong password
- duplicate account

**Journal**
- Create
- Read
- Update
- Delete
- ownership
- unauthorized access

**E2EE**
- Server database contains ciphertext
- Server logs contain no plaintext
- Browser can decrypt
- Wrong key cannot decrypt
- export/import works

**Infrastructure**
- Redis cache hit/miss
- MongoDB connection
- Kafka producer
- Kafka consumer
- email delivery
- scheduler

---

### Phase 10 — Documentation

Finally document:
```
README
├── Architecture
├── Tech stack
├── Local development
├── Cloud deployment
├── Authentication
├── E2EE design
├── Redis usage
├── Kafka usage
├── Database design
├── Environment variables
├── Security model
└── Known limitations
```

And importantly explain:

> **What the server can and cannot see.**

That's one of the most interesting parts of this project.

---

## The final architecture I'd target

```
                     ┌───────────────────┐
                     │   React/Vite       │
                     │   Frontend         │
                     └─────────┬─────────┘
                               │
                     Google OAuth / HTTPS
                               │
                     ┌─────────▼─────────┐
                     │   Spring Boot      │
                     │   Backend          │
                     └───┬─────┬─────┬───┘
                         │     │     │
                ┌────────▼┐ ┌──▼──┐ ┌▼─────────┐
                │ MongoDB │ │Redis│ │  Kafka    │
                │ Atlas   │ │     │ │  Aiven    │
                └─────────┘ │     │ └────┬─────┘
                             │     │      │
                          Upstash  │      ▼
                                   │  Sentiment
                                   │  Consumer
                                   │      │
                                   │      ▼
                                   │   Resend
                                   │
                                   └─ API cache
```

**With E2EE:**
```
                Browser
                   │
           plaintext journal
                   │
                encrypt
                   │
                   ▼
               ciphertext
                   │
                   ▼
              Spring Boot
                   │
                   ▼
             MongoDB Atlas
```

The **server never gets the journal plaintext**.

---

## One more important change from Copilot

I would **not** call this "Do everything" anymore.

I'd give the AI agent these gates:

```
Phase 0
Security + correctness
      ↓
GATE ✅
      ↓
Phase 1
Cloud infrastructure
      ↓
GATE ✅
      ↓
Phase 2
Backend deployment
      ↓
GATE ✅
      ↓
Phase 3
React frontend
      ↓
GATE ✅
      ↓
Phase 4
Google authentication
      ↓
GATE ✅
      ↓
Phase 5
Domain/data cleanup
      ↓
GATE ✅
      ↓
Phase 6
E2EE
      ↓
GATE ✅
      ↓
Phase 7
E2EE-compatible sentiment + Kafka
      ↓
GATE ✅
      ↓
Phase 8–10
Security / testing / documentation
```

**This is the major thing I'd change.**

Copilot's plan is technically ambitious and has many good ideas, but it asks the agent to make too many architectural decisions simultaneously. The revised sequence gives you a working cloud JournalApp **before** introducing E2EE, and then turns E2EE into a deliberate second architectural milestone.

And because this is a learning project, you'll be able to understand **why MongoDB Atlas, Upstash Redis, Aiven Kafka, Spring Security, React, OAuth, and client-side encryption each exist**, rather than ending up with an AI-generated stack that simply happens to work.

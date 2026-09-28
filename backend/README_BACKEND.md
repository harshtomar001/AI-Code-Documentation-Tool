# AI Code Documentation Tool — Backend

> **Simple explanation:**  
> Ye project AI Code Documentation Tool ka **backend** hai. Backend ka kaam frontend se request lena, user ka account manage karna, PostgreSQL database me data save karna, OTP email bhejna, login karwana, JWT token dena, aur Google/Microsoft login handle karna hai.

---

# 1. Backend kya karta hai?

Agar aapko coding ka bilkul bhi experience nahi hai, to is backend ko ek **office** samjho:

- **Frontend** = Reception / website jahan user buttons click karta hai.
- **Backend (FastAPI)** = Office staff jo request process karta hai.
- **PostgreSQL** = Office ki database almirah jahan information store hoti hai.
- **Email service** = Courier jo OTP user ke email par bhejta hai.
- **JWT token** = User ka temporary ID card.
- **Google/Microsoft OAuth** = Google/Microsoft ke through identity verify karne ka system.
- **Alembic** = Database structure ko safely update karne wala migration system.
- **Docker** = PostgreSQL ko easily run karne ka container system.

Example:

```text
User
  ↓
React Frontend
  ↓
FastAPI Backend
  ↓
┌───────────────────────────────┐
│ Authentication                │
│ OTP / Email                   │
│ Google Login                  │
│ Microsoft Login               │
│ JWT                           │
└───────────────────────────────┘
  ↓
PostgreSQL Database
```

---

# 2. Technology Stack

Backend me currently ye technologies use ho rahi hain:

| Technology | Kaam |
|---|---|
| Python | Main programming language |
| FastAPI | Backend/API framework |
| PostgreSQL 16 | Database |
| SQLAlchemy | Python se database ke saath kaam |
| Alembic | Database migrations |
| Pydantic | Request validation |
| JWT | Login authentication token |
| bcrypt | Password/OTP hashing |
| Google OAuth | Google login |
| Microsoft OAuth | Microsoft login |
| SMTP | OTP/email sending |
| Docker | PostgreSQL container |
| Uvicorn | FastAPI server |

---

# 3. Folder Structure

```text
backend/
│
├── alembic/
│   └── versions/
│       ├── 9c220b87b404_create_users_table.py
│       ├── d88e4ffced6a_add_email_verification_and_otp.py
│       ├── 68d1d4047d4d_add_foreign_key_to_otp_user.py
│       └── 587fa3d5526d_add_user_identities.py
│
├── config/
│   ├── __init__.py
│   └── settings.py
│
├── database/
│   ├── __init__.py
│   ├── database.py
│   └── models.py
│
├── routes/
│   ├── __init__.py
│   └── auth.py
│
├── schemas/
│   ├── __init__.py
│   └── auth.py
│
├── services/
│   ├── __init__.py
│   ├── auth_service.py
│   ├── oauth_service.py
│   └── email_service.py
│
├── tests/
│   ├── __init__.py
│   └── test_auth.py
│
├── utils/
│   ├── __init__.py
│   ├── jwt.py
│   ├── otp.py
│   └── security.py
│
├── .env
├── .gitignore
├── docker-compose.yml
├── main.py
├── requirements.txt
└── README.md
```

---

# 4. Har folder ka simple meaning

## `main.py`

Ye backend ka **main entry point** hai.

Is file me:

- FastAPI application banti hai.
- Session middleware configure hota hai.
- Authentication routes add hote hain.
- `/` health/root endpoint available hota hai.

Backend start karne ke liye:

```powershell
uvicorn main:app --reload
```

---

## `config/`

Is folder me application ki settings hoti hain.

### `settings.py`

Yahan `.env` se configuration read hoti hai.

Examples:

- Database URL
- JWT secret
- Google Client ID
- Google Client Secret
- Microsoft Client ID
- Microsoft Client Secret
- SMTP settings
- Email address

**Important:** Passwords, API keys, client secrets aur JWT secret ko code me hard-code nahi karna hai.

---

# 5. Database

## `database/database.py`

Ye PostgreSQL ke saath connection establish karta hai.

Application SQLAlchemy ke through database se baat karti hai.

Basic flow:

```text
FastAPI
   ↓
SQLAlchemy
   ↓
PostgreSQL
```

---

## `database/models.py`

Ye define karta hai ki database me tables kaise honge.

Current important tables:

### `users`

User ki main information:

- id
- name
- email
- password_hash
- is_active
- is_verified
- created_at
- updated_at

---

### `user_identities`

Google/Microsoft identities yahan store hoti hain.

Iska purpose ye hai ki ek user ke multiple login providers ho sakte hain.

Example:

```text
User
 ├── Local password
 ├── Google
 └── Microsoft
```

Important fields:

```text
user_id
provider
provider_id
```

Provider examples:

```text
google
microsoft
```

---

### `otp_verifications`

OTP verification ke liye table.

Isme OTP ka **plain text** store nahi hota.

OTP ka hash store hota hai.

Important fields:

```text
user_id
otp_hash
purpose
expires_at
attempts
is_used
created_at
```

OTP purposes:

```text
email_verification
password_reset
```

---

# 6. Database ko Docker se start karna

Project me PostgreSQL ke liye Docker Compose configured hai.

### Step 1 — Docker Desktop open karo

Windows par Docker Desktop installed aur running hona chahiye.

### Step 2 — Backend folder me terminal kholo

```powershell
cd backend
```

### Step 3 — PostgreSQL start karo

```powershell
docker compose up -d
```

### Step 4 — Check karo

```powershell
docker ps
```

Aapko PostgreSQL container dikhna chahiye:

```text
ai_code_postgres
```

---

# 7. PostgreSQL directly check karna

Database ke andar enter karne ke liye:

```powershell
docker exec -it ai_code_postgres psql -U postgres -d ai_code_db
```

PostgreSQL ke andar:

```sql
\dt
```

Tables dekhne ke liye:

```sql
SELECT * FROM users;
```

Identity table:

```sql
SELECT * FROM user_identities;
```

OTP table:

```sql
SELECT * FROM otp_verifications;
```

PostgreSQL se bahar:

```sql
\q
```

---

# 8. Environment Variables — `.env`

Backend ko run karne ke liye `.env` file required hai.

Example structure:

```env
APP_NAME=AI Code Documentation Tool
DEBUG=True

DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_code_db

JWT_SECRET_KEY=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=http://localhost:8000/api/auth/microsoft/callback
MICROSOFT_TENANT=common

SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
EMAIL_FROM=
```

**Never commit real secrets to GitHub.**

`.gitignore` me `.env` hona chahiye.

---

# 9. Python dependencies install karna

Virtual environment banana recommended hai.

### Windows PowerShell

```powershell
python -m venv venv
```

Activate:

```powershell
.\venv\Scripts\Activate.ps1
```

Agar PowerShell activation policy error aaye, terminal ko appropriate permission ke saath configure karke dobara activate karein.

Dependencies:

```powershell
pip install -r requirements.txt
```

---

# 10. Alembic — Database Migration

Alembic ka kaam hai:

> Python models me database structure change hone par PostgreSQL ka structure safely update karna.

Current migration chain:

```text
Base
  ↓
9c220b87b404
  ↓
d88e4ffced6a
  ↓
68d1d4047d4d
  ↓
587fa3d5526d (current head)
```

### Current migration check

```powershell
python -m alembic current
```

Agar current migration latest head hai, output me:

```text
587fa3d5526d (head)
```

jaisa output aayega.

### Database ko latest migration par le jana

```powershell
python -m alembic upgrade head
```

### Migration history dekhna

```powershell
python -m alembic history
```

**Already-applied migration ko manually dobara run mat karo.**

---

# 11. Authentication System

Backend me local authentication ke saath Google aur Microsoft authentication available hai.

Authentication ke 3 main parts hain:

```text
1. Local Email + Password
2. Google Login
3. Microsoft Login
```

---

# 12. Local Registration ka flow

User register karta hai:

```text
Frontend
   ↓
POST /api/auth/register
   ↓
Backend email check karta hai
   ↓
Password hash hota hai
   ↓
User database me create hota hai
   ↓
OTP generate hota hai
   ↓
OTP hash database me save hota hai
   ↓
OTP email par send hota hai
```

User ko email par OTP milta hai.

Uske baad:

```text
POST /api/auth/verify-email
```

OTP correct hone par:

```text
is_verified = True
```

ho jata hai.

---

# 13. Password kaise store hota hai?

Backend password ko plain text me database me store nahi karta.

Example:

```text
User password:
MyPassword123

Database:
bcrypt hash
```

Login ke time backend password ko verify karta hai.

Password hashing ke liye bcrypt use hota hai.

---

# 14. OTP system

OTP generally 6-digit hota hai.

Example:

```text
482913
```

Backend OTP ko directly database me save nahi karta.

Instead:

```text
OTP
 ↓
Hash
 ↓
Database
```

Verification:

```text
User OTP
 ↓
Hash comparison
 ↓
Correct?
 ├── Yes → Verify
 └── No  → Reject
```

Current OTP expiry:

```text
10 minutes
```

Maximum attempts:

```text
5 attempts
```

---

# 15. Email Verification

Registration ke baad:

```text
POST /api/auth/verify-email
```

Request:

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

Correct OTP hone par email verify hota hai.

---

# 16. OTP Resend

Agar OTP nahi mila:

```text
POST /api/auth/resend-otp
```

Request:

```json
{
  "email": "user@example.com"
}
```

Purana unused OTP invalidate karke naya OTP generate/send kiya jata hai.

---

# 17. Login

Endpoint:

```text
POST /api/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "YourPassword123"
}
```

Login ke liye:

1. User exist hona chahiye.
2. User active hona chahiye.
3. Email verified hona chahiye.
4. Password correct hona chahiye.

Successful login ke baad JWT access token milta hai.

Example response:

```json
{
  "message": "Login successful",
  "access_token": "YOUR_JWT_TOKEN",
  "token_type": "bearer"
}
```

---

# 18. JWT kya hai?

JWT ko simple language me **temporary login ID card** samjho.

Login ke baad backend token deta hai.

Frontend protected API call karte waqt token bhejta hai:

```text
Authorization: Bearer <token>
```

Backend token verify karta hai.

Agar valid:

```text
Request allowed
```

Agar invalid/expired:

```text
401 Unauthorized
```

---

# 19. Current User

Endpoint:

```text
GET /api/auth/me
```

Is endpoint ke liye JWT required hai.

Ye current logged-in user ki information return karta hai.

Example:

```json
{
  "id": 1,
  "name": "User",
  "email": "user@example.com",
  "providers": [
    "local",
    "google"
  ],
  "has_password": true,
  "is_active": true,
  "is_verified": true
}
```

---

# 20. Forgot Password Flow

Agar user password bhool gaya:

### Step 1

```text
POST /api/auth/forgot-password
```

```json
{
  "email": "user@example.com"
}
```

Backend password reset OTP email karta hai.

### Step 2

OTP resend karna ho:

```text
POST /api/auth/resend-reset-otp
```

### Step 3

Password reset:

```text
POST /api/auth/reset-password
```

Example:

```json
{
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "NewPassword123"
}
```

Correct OTP hone par password update ho jata hai.

---

# 21. Google Login

Google login ka basic flow:

```text
Frontend
   ↓
GET /api/auth/google/login
   ↓
Google
   ↓
User Google account select karta hai
   ↓
Google callback
   ↓
GET /api/auth/google/callback
   ↓
Backend Google identity verify karta hai
   ↓
User create/find/link
   ↓
JWT token
```

Google identity ko `user_identities` table me store kiya jata hai.

---

# 22. Microsoft Login

Microsoft login ka flow Google jaisa hai:

```text
Frontend
   ↓
GET /api/auth/microsoft/login
   ↓
Microsoft
   ↓
User login
   ↓
GET /api/auth/microsoft/callback
   ↓
Backend identity verify karta hai
   ↓
User create/find/link
   ↓
JWT token
```

Microsoft configuration ke liye Microsoft Entra/Azure application me redirect URI backend ke configured callback URI se match honi chahiye.

---

# 23. Google/Microsoft account linking

Agar user already logged in hai aur apne account ke saath Google/Microsoft connect karna chahta hai:

### Google

```text
GET /api/auth/link/google
```

Callback:

```text
GET /api/auth/link/google/callback
```

### Microsoft

```text
GET /api/auth/link/microsoft
```

Callback:

```text
GET /api/auth/link/microsoft/callback
```

Example:

```text
One application account
       │
       ├── Email + Password
       ├── Google
       └── Microsoft
```

Isse user ko multiple login methods use karne ki facility milti hai.

---

# 24. Complete API List

Base URL:

```text
http://localhost:8000
```

Authentication prefix:

```text
/api/auth
```

## Local Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | New account |
| POST | `/api/auth/verify-email` | Email OTP verify |
| POST | `/api/auth/resend-otp` | Verification OTP resend |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/forgot-password` | Password reset OTP |
| POST | `/api/auth/resend-reset-otp` | Reset OTP resend |
| POST | `/api/auth/reset-password` | New password set |

## Google

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/auth/google/login` | Start Google login |
| GET | `/api/auth/google/callback` | Google callback |
| GET | `/api/auth/link/google` | Link Google account |
| GET | `/api/auth/link/google/callback` | Google linking callback |

## Microsoft

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/auth/microsoft/login` | Start Microsoft login |
| GET | `/api/auth/microsoft/callback` | Microsoft callback |
| GET | `/api/auth/link/microsoft` | Link Microsoft account |
| GET | `/api/auth/link/microsoft/callback` | Microsoft linking callback |

## User

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/auth/me` | Current logged-in user |

---

# 25. Swagger API Documentation

FastAPI automatically documentation generate karta hai.

Backend start:

```powershell
uvicorn main:app --reload
```

Browser me open:

```text
http://127.0.0.1:8000/docs
```

Yahan aap:

- endpoints dekh sakte ho
- request body dekh sakte ho
- API test kar sakte ho
- response dekh sakte ho

Alternative documentation:

```text
http://127.0.0.1:8000/redoc
```

---

# 26. Backend Start Karne ka Complete Process

Agar computer restart ho gaya aur backend dobara start karna hai, ye steps follow karo.

## Step 1 — Project folder

```powershell
cd backend
```

## Step 2 — Virtual environment

```powershell
.\venv\Scripts\Activate.ps1
```

## Step 3 — Docker PostgreSQL

```powershell
docker compose up -d
```

## Step 4 — Migration check

```powershell
python -m alembic current
```

## Step 5 — Migration update

Agar database latest migration par nahi hai:

```powershell
python -m alembic upgrade head
```

## Step 6 — Backend start

```powershell
uvicorn main:app --reload
```

## Step 7 — Swagger open

```text
http://127.0.0.1:8000/docs
```

---

# 27. Recommended Startup Order

Har baar ye order follow karo:

```text
1. Docker Desktop
       ↓
2. PostgreSQL container
       ↓
3. Python virtual environment
       ↓
4. Alembic migration check
       ↓
5. FastAPI/Uvicorn
       ↓
6. Swagger / Frontend
```

---

# 28. Frontend aur Backend ka connection

Frontend generally backend ko HTTP requests bhejega.

Example:

```text
React
  ↓
POST http://localhost:8000/api/auth/login
  ↓
FastAPI
  ↓
PostgreSQL
  ↓
Response
  ↓
React
```

Example successful login:

```text
React
  ↓
Email + Password
  ↓
FastAPI
  ↓
Password verification
  ↓
JWT generated
  ↓
React receives JWT
```

---

# 29. CORS

Agar frontend aur backend alag ports par run ho rahe hain, example:

```text
Frontend:
http://localhost:5173

Backend:
http://localhost:8000
```

to browser cross-origin request rules apply karega.

Agar frontend API call nahi kar pa raha ho, backend me CORS configuration check karo.

---

# 30. Common Problems

## Problem 1 — `uvicorn` not recognized

Try:

```powershell
python -m uvicorn main:app --reload
```

---

## Problem 2 — Database connection error

Check:

```powershell
docker ps
```

PostgreSQL container running hona chahiye.

Then `.env` me:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_code_db
```

credentials aur port check karo.

---

## Problem 3 — Alembic error

First:

```powershell
python -m alembic current
```

Then:

```powershell
python -m alembic history
```

Usually database migration state aur migration files compare karne se problem identify ho jati hai.

---

## Problem 4 — `password cannot be longer than 72 bytes`

Backend bcrypt use karta hai.

Password ki UTF-8 byte length 72 se zyada nahi honi chahiye.

Schema is condition ko validate karta hai.

---

## Problem 5 — OTP email nahi aa raha

Check:

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USERNAME=
SMTP_PASSWORD=
EMAIL_FROM=
```

Also check:

- SMTP credentials correct hain?
- Sender email correct hai?
- Spam/Junk folder check kiya?
- SMTP provider ne login allow kiya hai?
- `.env` load ho raha hai?

**Real SMTP password/API credential GitHub par upload mat karo.**

---

## Problem 6 — Google OAuth error

Check:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

Google Cloud Console me redirect URI exactly match honi chahiye:

```text
http://localhost:8000/api/auth/google/callback
```

---

## Problem 7 — Microsoft OAuth error

Check:

```env
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=
MICROSOFT_TENANT=
```

Aur Microsoft application registration me redirect URI same honi chahiye.

---

# 31. Security Rules

## `.env` GitHub par mat daalo

`.gitignore`:

```gitignore
.env
venv/
__pycache__/
*.pyc
```

## Secrets code me mat likho

Wrong:

```python
PASSWORD = "real-password"
```

Correct:

```python
PASSWORD = settings.SMTP_PASSWORD
```

## JWT secret strong rakho

Production me random long secret use karo.

## HTTPS

Local development:

```text
http://localhost
```

Production:

```text
https://your-domain.com
```

Production me secure cookies/session settings use karni chahiye.

---

# 32. Authentication Architecture

Overall architecture:

```text
                    ┌─────────────────┐
                    │     Frontend    │
                    │ React / Vite    │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     FastAPI     │
                    │     Routes      │
                    └────────┬────────┘
                             │
             ┌───────────────┼────────────────┐
             ▼               ▼                ▼
      ┌────────────┐  ┌────────────┐  ┌────────────┐
      │ Auth       │  │ OAuth      │  │ Email/OTP  │
      │ Service    │  │ Service    │  │ Service    │
      └─────┬──────┘  └─────┬──────┘  └────────────┘
            │               │
            └───────┬───────┘
                    ▼
             ┌──────────────┐
             │  PostgreSQL  │
             │              │
             │ users        │
             │ identities   │
             │ OTPs         │
             └──────────────┘
```

---

# 33. File Responsibility — Ek line me

| File | Kaam |
|---|---|
| `main.py` | FastAPI app start |
| `config/settings.py` | Environment/configuration |
| `database/database.py` | DB connection |
| `database/models.py` | DB tables/models |
| `routes/auth.py` | API endpoints |
| `schemas/auth.py` | Request validation |
| `services/auth_service.py` | Local auth logic |
| `services/oauth_service.py` | Google/Microsoft logic |
| `services/email_service.py` | Email sending |
| `utils/security.py` | Password/OTP hashing |
| `utils/jwt.py` | JWT creation/verification |
| `utils/otp.py` | OTP generation |
| `alembic/` | DB migrations |
| `tests/` | Automated tests |
| `.env` | Secret/config values |
| `docker-compose.yml` | PostgreSQL container |

---

# 34. Complete User Journey

## New user

```text
Register
   ↓
OTP email
   ↓
Verify OTP
   ↓
Email verified
   ↓
Login
   ↓
JWT token
   ↓
Access protected APIs
```

## Existing user

```text
Login
   ↓
JWT
   ↓
Protected APIs
```

## Forgot password

```text
Forgot Password
   ↓
Reset OTP email
   ↓
Enter OTP
   ↓
New password
   ↓
Password updated
```

## Google

```text
Google Login
   ↓
Google authentication
   ↓
Google callback
   ↓
User identity
   ↓
JWT
```

## Microsoft

```text
Microsoft Login
   ↓
Microsoft authentication
   ↓
Microsoft callback
   ↓
User identity
   ↓
JWT
```

---

# 35. Important Development Rule

Code me change karne ke baad blindly database reset mat karo.

Agar model/table structure change hota hai:

```text
1. Model update
2. Alembic migration create
3. Migration review
4. Migration upgrade
5. API test
```

Typical commands:

```powershell
python -m alembic revision --autogenerate -m "describe change"
python -m alembic upgrade head
```

Migration file ko apply karne se pehle review karna recommended hai.

---

# 36. Quick Commands Cheat Sheet

### Start PostgreSQL

```powershell
docker compose up -d
```

### Stop PostgreSQL

```powershell
docker compose down
```

### Check containers

```powershell
docker ps
```

### Activate virtual environment

```powershell
.\venv\Scripts\Activate.ps1
```

### Install dependencies

```powershell
pip install -r requirements.txt
```

### Check migration

```powershell
python -m alembic current
```

### Upgrade database

```powershell
python -m alembic upgrade head
```

### Migration history

```powershell
python -m alembic history
```

### Start backend

```powershell
uvicorn main:app --reload
```

### Alternative backend start

```powershell
python -m uvicorn main:app --reload
```

### Swagger

```text
http://127.0.0.1:8000/docs
```

### ReDoc

```text
http://127.0.0.1:8000/redoc
```

---

# 37. First-Time Setup — Short Version

Agar koi bilkul naya person project run kar raha hai:

```powershell
cd backend

python -m venv venv

.\venv\Scripts\Activate.ps1

pip install -r requirements.txt

docker compose up -d

python -m alembic upgrade head

uvicorn main:app --reload
```

Then browser:

```text
http://127.0.0.1:8000/docs
```

---

# 38. Backend Ready Checklist

Backend ko ready maanane se pehle check karo:

- [ ] Docker Desktop running
- [ ] PostgreSQL container running
- [ ] `.env` configured
- [ ] Python dependencies installed
- [ ] Alembic migration current
- [ ] FastAPI starts without errors
- [ ] `/docs` opens
- [ ] Register works
- [ ] OTP email arrives
- [ ] Email verification works
- [ ] Login works
- [ ] JWT works
- [ ] `/me` works
- [ ] Forgot password works
- [ ] Reset password works
- [ ] Google OAuth configured
- [ ] Microsoft OAuth configured
- [ ] Google linking configured
- [ ] Microsoft linking configured

---

# 39. One-Minute Explanation for Team Members

Agar kisi teammate ko sirf 1 minute me backend samjhana ho:

> **Ye FastAPI based backend hai. PostgreSQL database Docker ke through run hota hai. SQLAlchemy database se communication karta hai aur Alembic database migrations handle karta hai. Authentication me email/password, OTP email verification, forgot-password OTP, JWT, Google OAuth aur Microsoft OAuth implemented hain. Local user ki main information `users` table me hoti hai, Google/Microsoft identities `user_identities` table me aur OTP information `otp_verifications` table me hoti hai. `routes/auth.py` APIs provide karta hai, `auth_service.py` local authentication logic handle karta hai, `oauth_service.py` Google/Microsoft logic handle karta hai aur `email_service.py` email bhejta hai. Backend Uvicorn se start hota hai aur FastAPI Swagger docs `/docs` par available hain.**

---

# 40. Final Architecture

```text
                         AI CODE DOCUMENTATION TOOL
                                  BACKEND
                                     │
                                     ▼
                              ┌─────────────┐
                              │   FastAPI   │
                              └──────┬──────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ▼                  ▼                  ▼
             Local Auth          Google OAuth      Microsoft OAuth
                  │                  │                  │
                  └──────────────────┼──────────────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │ Auth Logic  │
                              │ JWT / OTP   │
                              └──────┬──────┘
                                     │
                       ┌─────────────┼─────────────┐
                       │             │             │
                       ▼             ▼             ▼
                    users       identities        OTPs
                       │             │             │
                       └─────────────┼─────────────┘
                                     ▼
                              ┌─────────────┐
                              │ PostgreSQL  │
                              └─────────────┘
                                     ▲
                                     │
                               Docker Compose
```

---

## Important

This README describes the current backend architecture and the authentication endpoints implemented in this project.

Before production deployment:

- real secrets must be kept outside Git
- production HTTPS must be configured
- OAuth redirect URIs must use the production domain
- SMTP/OAuth credentials must be securely managed
- database backups should be configured
- rate limiting and additional production hardening should be considered


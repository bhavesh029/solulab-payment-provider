# Payment Provider Backend

## 📖 Overview
This project is a highly secure, production-grade Payment Provider Backend built with **NestJS**. It simulates a core banking system that processes payments asynchronously, encrypts highly sensitive card information (PAN) securely at rest, and manages complex state transitions in a reliable and idempotent manner.

The system is designed with **PCI-DSS compliance principles** in mind, featuring AES-256-GCM encryption, secure UUIDv4 tokenization, and comprehensive transient error handling through exponential backoff queues.

## 🛠 Tech Stack & Key Libraries
- **Framework:** NestJS
- **Language:** TypeScript
- **Database:** PostgreSQL (via TypeORM)
- **Message Queue & Caching:** Redis (via BullMQ and ioredis)
- **Security & Authentication:** 
  - `bcrypt` & `passport-jwt` for User Auth
  - `crypto` (Node.js native) for AES-256-GCM Card Encryption
- **Validation:** `class-validator` (Custom Luhn Algorithm implementation)
- **Rate Limiting:** `@nestjs/throttler`
- **Observability:** 
  - `nestjs-pino` & `pino-http` (Structured JSON Logging)
  - `nestjs-cls` (Request Correlation IDs)
  - `@willsoto/nestjs-prometheus` & `prom-client` (Metrics)

## 🚀 Setup & Installation

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose** (for running PostgreSQL and Redis locally)

### 2. Clone the Repository
```bash
git clone <your-repo-url>
cd solulab_assignment
```

### 3. Setup Environment Variables
Create a `.env` file in the root of your project and populate it with the following required variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=payment_db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Application Secrets
JWT_SECRET=super_secret_jwt_key_12345
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef  # MUST be exactly 32 bytes for AES-256
PORT=3000
```

### 4. Start Infrastructure
Start the PostgreSQL and Redis containers using Docker Compose:
```bash
docker-compose up -d
```

### 5. Install Dependencies & Run
```bash
# Install node modules
npm install --legacy-peer-deps

# Run the application in development mode
npm run start:dev
```

The application will now be running on `http://localhost:3000`.

## 📚 API Documentation & Metrics
- **Swagger UI:** [http://localhost:3000/api](http://localhost:3000/api)
- **Prometheus Metrics:** [http://localhost:3000/metrics](http://localhost:3000/metrics)

## 🗄️ Database Schema Design

The system uses three primary entities to manage users, encrypted payment methods, and historical transaction states.

### 1. `users`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Unique user identifier |
| `email` | String | Unique | User's email |
| `password` | String | | Bcrypt hashed password |

### 2. `cards`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Unique card identifier |
| `user_id` | UUID | Foreign Key | Owner of the card (Refers to `users.id`) |
| `encrypted_pan` | String | | AES-256-GCM Encrypted PAN |
| `last4` | String | | Masked PAN (e.g. 4242) |
| `exp_month` | Int | | Expiration month |
| `exp_year` | Int | | Expiration year |
| `token` | String | Unique | Secure token used for payments |

### 3. `transactions`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | Unique transaction identifier |
| `user_id` | UUID | Foreign Key | Initiating User (Refers to `users.id`) |
| `card_id` | UUID | Foreign Key | Associated Card (Refers to `cards.id`) |
| `amount` | Decimal| | Payment amount |
| `currency` | String | Default 'USD' | Currency code |
| `status` | Enum | | State (`INITIATED`, `PROCESSING`, `AUTHORIZED`, `CAPTURED`, `FAILED`, `RETRYING`) |
| `idempotency_key`| String | Unique Index| Prevents double charges |
| `bank_transaction_id` | String | Nullable | External Bank ID |
| `authorization_code` | String | Nullable | Authorization Code |
| `retry_count` | Int | Default 0 | Number of attempts |

### 4. `transaction_history`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | Primary Key | History record ID |
| `transaction_id`| UUID | Foreign Key | Associated Transaction (Refers to `transactions.id`) |
| `from_status` | Enum | Nullable | Previous State |
| `to_status` | Enum | | New State |
| `reason` | String | | Reason for transition |
| `created_at` | Date | | Timestamp |

## 🧪 Testing
The application uses Jest for automated testing covering critical business rules (Encryption, Luhn Algorithm validation, and BullMQ State Transitions).

```bash
# Run unit tests
npm run test

# Run tests with coverage
npm run test -- --coverage
```

# SecureShop — DevSecOps Workshop 3

A lightweight e-commerce microservices platform used to practice DevSecOps toolchains.

## Architecture

| Service | Language | Port | Responsibilities |
|---|---|---|---|
| User Service | Python (FastAPI) | 8001 | Registration, login, JWT |
| Product Service | Python (FastAPI) | 8002 | Catalogue, search |
| Order Service | Node.js (Express) | 8003 | Cart, order lifecycle |
| Payment Service | Node.js (Express) | 8004 | Payment, transactions |
| Notification Service | Python (FastAPI) | 8005 | Email/SMS via RabbitMQ |
| Inventory Service | Node.js (Express) | 8006 | Stock, reservation |

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/secureshop.git
cd secureshop

# 2. Set up environment
cp .env.example .env
# Edit .env and fill in your values

# 3. Start all services
docker compose up --build

# 4. Test
curl http://localhost/api/users/health
curl http://localhost/api/products/health
```

## CI/CD Pipeline (GitHub Actions)

| Workflow | Trigger | Tools |
|---|---|---|
| `sast.yml` | push / PR | Bandit, Semgrep |
| `sca.yml` | push / PR | Trivy, OWASP Dependency-Check |
| `secrets.yml` | push / PR | Gitleaks, TruffleHog |
| `container-scan.yml` | push main | Trivy, Grype |
| `dast.yml` | push main / weekly | OWASP ZAP |
| `pipeline.yml` | push / PR | Full orchestrator |

## GitHub Secrets Required

Set these in **Settings → Secrets → Actions**:

```
JWT_SECRET
USER_DB_URL
PRODUCT_DB_URL
RABBITMQ_URL
RABBITMQ_USER
RABBITMQ_PASS
SMTP_PASSWORD
STRIPE_KEY
```

## View Security Results

Go to **Security → Code Scanning** in your GitHub repository to see all SARIF findings from SAST, SCA, and container scans.

## Project Structure

```
secureshop/
├── .github/workflows/      # CI/CD pipeline definitions
├── gateway/                # Nginx API Gateway
├── services/
│   ├── user-service/       # Python — auth & JWT
│   ├── product-service/    # Python — catalogue
│   ├── order-service/      # Node.js — orders
│   ├── payment-service/    # Node.js — payments
│   ├── notification-service/ # Python — notifications
│   └── inventory-service/  # Node.js — stock
├── .gitleaks.toml          # Secrets scanning config
├── .zap/rules.tsv          # ZAP DAST rules
├── docker-compose.yml
└── .env.example
```

# AgentShield — The AI Immune System 🛡️

AgentShield is a security gateway prototype that monitors, evaluates, and controls actions requested by autonomous AI agents **before** those actions execute.

---

## 🌟 Core Features

- **Pre-Execution Gatekeeper**: Every agent action is evaluated before tool execution.
- **Three-Way Decision Engine**:
  - `ALLOW`: Safe actions execute immediately with short-lived scoped credentials.
  - `BLOCK`: Dangerous or prohibited actions are stopped and logged.
  - `REVIEW`: Sensitive operations require explicit human approval.
- **Tamper-Evident HMAC Audit Trail**: Every evaluated action is cryptographically signed and stored in SQLite.
- **Anomaly Detection**: Rolling window frequency monitor detecting burst requests and behavioral deviations.
- **Approval Queue with Re-validation**: Modifying action payloads invalidates prior approval signatures.
- **Interactive Demo Lab**: 6 pre-built scenarios demonstrating safe reads, unauthorized file access, production deployments, anomaly detection, and re-validation guarantees.
- **Real-Time WebSocket Updates**: Live security event streaming to the Next.js frontend.

---

## 🚀 Quick Start

### 1. Run Everything With One Click (Windows)
Double-click or run:
```cmd
start.bat
```

### 2. Manual Start

#### Backend:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
API Documentation will be accessible at: `http://127.0.0.1:8000/docs`

#### Frontend:
```bash
cd frontend
npm install
npm run dev
```
Dashboard will be accessible at: `http://localhost:3000`

---

## 🧪 Testing

To run the automated security policy test suite:
```bash
cd backend
python -m pytest tests/test_security.py -v
```
All 22 security, idempotency, anomaly detection, and gateway unit tests pass.

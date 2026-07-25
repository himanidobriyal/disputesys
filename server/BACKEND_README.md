# Node Backend — Dispute Resolution System

## Setup

```bash
cd server
npm install mongoose axios cors express dotenv
```

Make sure `server/.env` has:
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/disputeDB?retryWrites=true&w=majority&appName=Cluster0
AI_SERVICE_URL=http://localhost:8000
JWT_SECRET=change_this_later
PORT=5000
```

## Run

```bash
npm run dev
```

You should see:
```
MongoDB connected: disputeDB
Server running on port 5000
```

If you see a MongoDB connection error, check:
- Password in `MONGO_URI` is correct (no `<>` brackets left in)
- Network Access in Atlas has your IP (or 0.0.0.0/0) whitelisted
- Database user has read/write privileges

## API Endpoints

### 1. Create a dispute
```
POST http://localhost:5000/api/disputes
Content-Type: application/json

{
  "disputeId": "AMEX-D-001",
  "cardMemberId": "CM-001",
  "merchantId": "MER-001",
  "transaction": { "merchant": "Amazon.com", "amount": 1200.00, "date": "2026-07-14" },
  "disputeDetails": {
    "reasonCode": "C08",
    "reasonDescription": "Goods/Services Not Received",
    "dateFiled": "2026-07-18",
    "cardMemberStatement": "I ordered a laptop on July 14. Tracking has not updated since July 14 and the item never arrived. I contacted the merchant twice with no resolution."
  }
}
```

### 2. Add card member evidence
```
POST http://localhost:5000/api/disputes/AMEX-D-001/evidence
Content-Type: application/json

{
  "evidenceId": "EV-001",
  "submittedBy": "cardMember",
  "type": "invoice",
  "text": "Invoice for laptop purchase, $1200.00, dated 2026-07-14."
}
```

### 3. Add merchant evidence
```
POST http://localhost:5000/api/disputes/AMEX-D-001/evidence
Content-Type: application/json

{
  "evidenceId": "EV-003",
  "submittedBy": "merchant",
  "type": "proof_of_delivery",
  "text": "Tracking record shows package delivered on 2026-07-16. No signed confirmation on file."
}
```

### 4. Trigger AI scoring
Requires ai-service to be running on port 8000.
```
POST http://localhost:5000/api/disputes/AMEX-D-001/score
```
Returns the full dispute document with `scoring` and `decision` populated.

### 5. Get a dispute
```
GET http://localhost:5000/api/disputes/AMEX-D-001
```

### 6. List all disputes
```
GET http://localhost:5000/api/disputes
```

## Testing with VS Code REST Client / Thunder Client
Install the "REST Client" or "Thunder Client" extension, create a file
`server/test-requests.http`, and paste the requests above — you can then
click "Send Request" above each block instead of switching to Postman.

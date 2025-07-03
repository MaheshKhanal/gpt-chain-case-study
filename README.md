#Ingest API

A minimal backend API for processing guidelines with GPT chaining, built with TypeScript, Express, BullMQ, and PostgreSQL.

## Features

- **Fast job submission** (POST /jobs) returning event_id in <200ms
- **Concurrent processing** with BullMQ workers
- **Two-step GPT chain**: summarize text → generate actionable checklist
- **Job status tracking** (GET /jobs/{event_id})
- **Auto-generated OpenAPI documentation** at `/api-docs`

## Quick Start

```bash
# 1. Clone and setup
git clone <repo-url>
cd guideline-ingest-api

# 2. Create .env file
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# 3. Start everything
docker compose up --build

# 4. Test the API
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"text": "Some instructions to summarize and generate checklist"}'

# 5. Check job status
curl http://localhost:3000/jobs/{event_id}
```

## Architecture

**API Layer**: Express server handles HTTP requests, validates input, and queues jobs
**Queue**: BullMQ with Redis manages job distribution and concurrency  
**Worker**: Processes jobs using OpenAI GPT-3.5-turbo in two steps
**Database**: PostgreSQL stores job state and results

## AI-Assisted Development

I used claude to generate comprehensive tests and create Docker configuration. I also used claude to generate swagger documentation. 

## Testing

```bash
npm test              # Run tests
npm run test:coverage # Run with coverage report
```

## Endpoints

- `POST /jobs` - Submit guideline text for processing
- `GET /jobs/{event_id}` - Get job status and results
- `GET /health` - Health check
- `GET /api-docs` - Swagger documentation
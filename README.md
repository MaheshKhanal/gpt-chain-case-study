## Ingest API

A minimal backend API for processing guidelines with GPT chaining, built with TypeScript, Express, BullMQ, and PostgreSQL.
I could have gone python route but it would have taken me a little longer to complete as I am not too familier with Django + Celery part. I went with TS stack since its my comfort. 

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

# 4. Test the API. You can either do a `curl` request and test it via Swagger docs. `/api-docs`
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{"text": "Text for llm to summarize and generate checklist"}'

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
```

## Endpoints

- `POST /jobs` - Submit guideline text for processing
- `GET /jobs/{event_id}` - Get job status and results
- `GET /health` - Health check
- `GET /api-docs` - Swagger documentation

# PSA ByteSize Platform

Full-stack workspace combining a FastAPI backend with a Next.js frontend to power PSA's internal talent and engagement experiences.

## Prerequisites

- Python 3.10+
- Node.js 18+ (with npm or yarn)
- Azure OpenAI credentials configured in a `.env` file inside `backend/`

## Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Set the following environment variables in `backend/.env` (values provided by PSA):

- `AZURE_OPENAI_CHAT_KEY`
- `AZURE_OPENAI_CHAT_ENDPOINT`
- `AZURE_OPENAI_CHAT_API_VERSION`
- `OPENAI_CHAT_MODEL` (default `gpt-4.1-nano`)
- `AZURE_OPENAI_EMBED_KEY`
- `AZURE_OPENAI_EMBED_ENDPOINT`
- `AZURE_OPENAI_EMBED_API_VERSION`
- `OPENAI_EMBED_MODEL` (default `text-embedding-3-small`)

Optional overrides:

- `CHATBOT_SOURCE_PATH`
- `CHATBOT_TOP_K`
- `CHATBOT_CHUNK_SIZE`
- `CHATBOT_CHUNK_OVERLAP`
- `PROMPT_DIR`
- `DATA_DIR`

### API Surface

- `POST /api/chatbot` — Retrieval-augmented PSA knowledge bot (embeddings cached from `data/content_psa.txt`).
- `POST /api/community/polish` — Tone-aware community post polishing.
- `POST /api/learning/recommendation` — Course fit analysis powered by `prompt/Learning_Hub_course_recommend.md`.
- `POST /api/career/navigator` — Career fit narrative and dimension scores following `prompt/Career_Navigator.md`.
- Supporting catalogue endpoints expose courses, jobs, wellness events, and employee profiles from `backend/data`.

## Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` to the backend origin (for example `http://localhost:8000`).
An example file is provided as `frontend/.env.example`.

To produce a production build:

```bash
npm run build
npm run start
```

## Combined Local Development

1. Start the backend:
   ```bash
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
2. In a separate terminal start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

The frontend proxies all API traffic to `NEXT_PUBLIC_API_BASE_URL`, so both services run independently without additional tooling.

## Deployment Notes

- The backend is stateless; deploy behind a WSGI/ASGI server (Uvicorn, Gunicorn, Azure App Service, etc.).
- Ensure the backend has read access to `backend/data/` and `backend/prompt/`.
- For container deployments, copy both `backend/` and `frontend/` into the image and run the two services separately or behind a reverse proxy.
- Configure CORS on the backend if the frontend is hosted on a different domain; FastAPI's `CORSMiddleware` can be added in `app/main.py` if required.

## Validation

- Backend syntax gate: `cd backend && python -m compileall app`
- Frontend checks: `cd frontend && npm run lint`

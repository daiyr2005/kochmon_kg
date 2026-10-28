
# Kochmon AI frontend

## Local development

1. Start the backend at `http://localhost:8000` and seed its catalog.
2. Copy `.env.example` to `.env.local`; set `VITE_API_URL=http://localhost:8000` for a direct connection, or leave it unset to use the Vite `/api` proxy.
3. Install dependencies with `npm install`, then run `npm run dev`.

The production frontend must be built with `VITE_API_URL` set to the deployed API origin.
Never put provider secrets in frontend `VITE_*` variables; configure them only in the backend `.env`.

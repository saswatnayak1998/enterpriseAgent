# Next.js DIA (FAISS + NVIDIA NIM)

## Overview
- Next.js app (app router) with a simple chat UI
- API route calls a Python FAISS retriever for context and then sends prompts to NVIDIA NIM (OpenAI-compatible Chat Completions)

## Quick start
1. Install Node deps:
```bash
cd next-rag
npm i
```
2. Copy `.env.example` to `.env` and set `NIM_BASE_URL`, `NIM_API_KEY`, `NIM_MODEL`, and `RETRIEVER_URL`.
3. Start dev server:
```bash
npm run dev
```

## Deploy to Vercel
- Push this folder to a Git repo and import in Vercel
- Set environment variables in Vercel Project settings:
  - `NIM_BASE_URL`
  - `NIM_API_KEY`
  - `NIM_MODEL`
  - `RETRIEVER_URL` (point to a reachable Python retriever URL)
  - `TOP_K` (optional, default 4)

## Python retriever
- A separate FastAPI service exposes `/search` returning top chunks of text. See `retriever/`. 
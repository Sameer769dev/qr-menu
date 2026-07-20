# QR Menu — Digital Menu & Direct Ordering

A web platform for restaurants and cafes in Nepal. Owners build a digital menu, print QR codes for their tables, and receive orders live on a kitchen dashboard. Customers scan, browse, and order from their phone browser — no app downloads, no POS hardware.

Built with Next.js 14 (App Router) + Supabase (database, auth, realtime, storage).

## Features

- Owner signup/login with per-restaurant accounts (multi-tenant)
- Menu builder: categories, items, prices, photo uploads, sold-out toggle
- Tables & QR: one printable QR per table
- Customer menu at `/m/<slug>?t=<table>`: mobile-first cart and ordering
- Live kitchen board with sound alerts and status flow
- Staff mode: PIN-based waiter/kitchen logins that lock the shared device to the Orders board, with per-staff order attribution and a walk-in order composer
- Owner overview: setup checklist, 7-day revenue, bestsellers, end-of-day reconciliation
- Operator panel at `/admin`: tenant list, billing status (trial/paid/due/overdue), MRR, suspend/reactivate

## Setup

1. Create a free project at [supabase.com](https://supabase.com), open SQL Editor, and run all of `supabase/schema.sql`. Change the operator email in `grant_operator_admin` first.
2. Recommended: Authentication → Sign In / Providers → turn OFF "Confirm email".
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase URL + anon key (Project Settings → API).
4. `npm install && npm run dev` → http://localhost:3000

## Deploy (Vercel)

Import this repo in Vercel, add the two env vars from `.env.local`, deploy. Print QR codes from the production site (they embed the domain).

See `WORKFLOWS.md` for the complete owner / staff / operator playbook.

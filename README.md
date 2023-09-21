# Upstreet <a href="https://discord.gg/dRJ2ba46MJ"><img style="float: right" src="https://dcbadge.vercel.app/api/server/dRJ2ba46MJ" alt=""></a>

<img src="packages/docs/image1.jpg" width=100% />

<p style="text-align: center"><a href="https://github.com/avaer/upstreet.ai/blob/main/LICENSE"><img style="padding-left: 5px;" src="https://img.shields.io/badge/License-MIT-blue" alt=""></a> <a href="https://github.com/avaer/upstreet.ai"><img style="padding-left: 5px;" src="https://img.shields.io/github/forks/avaer/upstreet.ai?style=social" alt=""></a> <a href="https://github.com/avaer/upstreet.ai/stargazers"><img style="padding-left: 5px;" src="https://img.shields.io/github/stars/avaer/upstreet?style=social" alt=""></a></p>

<p align="center">
An open source, AI-centric multiplayer game engine that anyone can host. Easy to use, runs in the browser and utilizes open tools and standards like <a href="https://github.com/mrdoob/three.js">three.js</a> and <a href="https://github.com/nodejs/node">Node</a>, with an <a href="https://github.com/avaer/upstreet">SDK</a> for building custom agents in Python and JS.
</p>

## Key Features

- 🎮 A full-featured game engine running in your browser
- ♾️ Infinite procedurally generated world
- 🧑‍🤝‍🧑 Multiplayer with voice and chat
- 🤖 AI-powered NPCs in world
- 🤖 Connect your own agents!
- 👓 Supports desktop and VR (mobile coming soon)
- 😊 Expressive, vocal and emotive avatars
- 🔮 Runtime support for user uploads and custom apps
- 🖥️ Completely self-hostable

<p align="center">
<img src="packages/docs/combat.gif" width=30% padding="0" margin="0" align="center" />
<img src="packages/docs/asteroids.gif" width=30% align="center" />
<img src="packages/docs/rug_radio.gif" width=30% align="center" />
</p>
<p align="center">
<img src="packages/docs/rotation.gif" width=91% align="center" />
</p>
<p align="center">
<img src="packages/docs/Uncanny_alley.gif" width=30% align="center" />
<img src="packages/docs/monster_truck.gif" width=30% align="center" />
<img src="packages/docs/plane.gif" width=30% align="center" />
</p>

## Minimum Requirements

- 10 GB Disk Space
- 8 GB RAM
- 4 Core CPU / vCPUs
- Node version 19.0.0. The recommended way to get node is `nvm`: https://github.com/nvm-sh/nvm

## Installation

**Important note before you clone this repo:** This repo uses Git submodules.
You need to install with the `--recurse-submodules` flag or installation will not work. Copy the code below to clone the repository if you aren't sure.

```sh
git clone --recurse-submodules https://github.com/avaer/upstreet.ai.git && cd webaverse
npm install # Install dependencies
```

# Quickstart

This is the Upstreet.ai client app. It is written in THREE.js, React, and Vite.

```bash
npm install
npm run dev
```

Then visit https://local.upstreet.ai:4443/ in your browser.

To also run the local multiplayer server, we will also need to run the multiplayer Clouflare Worker via `wrangler`. To start it alongside the development server:

```bash
npm run mp
```

Note: This repository supports one-click hosting on [Vercel](https://vercel.com/) (see below).

---

# Project layout

To help you get started, here is the rough layout for the interesting parts of the project:

- `/`
  - `/servers/`
    - contains the dev servers that mimic local deployment of the Vercel + Cloudflare Workers deployment. Run via `npm run dev`.
    - `/servers/dev/dev-server.mjs`
      - the main dev server
  - `/index.html`
    - page served at `/`, mostly just the login screen
  - `/home.html`
    - the user page after successful login, uses `react-router` to serve the SPA
  - `/404.html`
    - the default handler page, mainly used for user short links (e.g. `https://isekai.chat/scene`)
  - `/pages/`
    - contains the core React code for the above HTML pages
    - `/pages/components/`
      - the UI components used by the app, shared between pages
  - `/styles/`
    - the app's componentized React styles (`.module.css`, imported by `vite`)
  - `/packages/`
    - `/packages/ui-kit/`
      - purchased React UI kit (not yet integrated)
    - all non-React dependencies used by the app
    - `/packages/engine/`
      - core 3D game engine which renders user scenes
        - `/packages/engine/clients/`
        - the clients used by the app, which connect the app to external storage and services
        - `/packages/engine/endpoints.js`
        - contains the endpoint URLs the app connects to
        - `/packages/engine/managers/`
        - factored core logic of the engine
        - `/packages/engine/engine{,-context,-runtime}.js`
        - the entry point for the 3D game engine
        - `/packages/engine/type_handlers/`
        - file type handlers supported by the engine (e.g. backgrounds, characters, items)
    - `/packages/payments/`
      - payments CloudFlare Worker
    - `/packages/multiplayer/`
      - multiplayer CloudFlare Worker

## Deployment configuration

The deployment is configured via `vite.config.js` and `vercel.json`. Vite, Vercel, and our dev server use these files as the source of truth for running the app.

---

# Deploy

## App (client)

This repo deploys to https://vercel.com/ with no configuration. Add the Github repo in the Vercel UI. You can also set your own custom domain there.

The client uses environment variables to route client requests to backend services. See below.

If you don't intend to run your own backend services then you're done!

## Backend (servers)

The additional backend apps that this app connects to.

By default, if no environment variables are specified, the hosted backends will be used. However, you can deploy these services yourself. Here's how:

---

# Multiplayer

[CloudFlare Worker](https://workers.cloudflare.com/) that uses [`wrangler`](https://github.com/cloudflare/workers-sdk).

This worker hosts the WebSocket server for supporting multiplayer realms. If you don't intend to use multiplayer, you do not need this.

## Development

You can run it locally, or on any server you like:

```bash
npm run mp
```

If you're running locally, you can simply connect to `https://local.upstreet.ai/`.

## Production

Use `wrangler` deploy to CloudFlare for production.

```bash
npm i -g wrangler # install wrangler if necessary
wrangler login # log in to your CloudFlare account
```

To deploy:

```bash
cd packages/multiplayer
wrangler deploy
```

When `wrangler deploy` finishes, it will output your new worker domain.

You can use this as-is; it is not displayed in the UI. However, if you prefer to use a custom domain, you can set it up in CloudFlare and point it to your newly deployed `multiplayer` worker.

Either way, to use this worker in your Vercel client production deployment, you will need to set the `MULTIPLAYER_HOST` environment variable to your chosen domain (e.g. `https://multplayer.isekai.chat`) in the Vercel UI.

# Payments

The `payments` app is also deploye with `wragler`.

It handles stripe payment requests and inference token deductions. It is written to make sure not to lose any uncredited payments, and also caches payments status to ensure fast response times for the client app.

```bash
npm i -g wrangler # install wrangler if necessary
wrangler login # log in to your CloudFlare account
```

To deploy:

```bash
cd packages/payments
wrangler deploy
```

The environment variables used should be set in `packages/payments/wrangler.toml`:

```
SUPABASE_URL="https://xxx.supabase.co"
STRIPE_SECRET_KEY="sk_test_xxx"
SUPABASE_SERVICE_API_KEY="xxx"
STRIPE_SUBSCRIPTION_PRICE_ID="price_xxx"
```

---

# Database server

We use `supabase` for database and file storage.

The endpoint is configured via the `SUPABASE_URL` environemnt variable.

The keys are provided in the client's `SUPABASE_PUBLIC_API_KEY` environment variable.

The database schema is in `sql/database-dump.sql`.

The `pg_dump` script which produces `sql/database-dump.sql` can be found in `scripts/dump-database.sh`.

---

# AI Cluster

To deploy your own AI cluster, you will need access to an H100 80GB GPU server or better. Recommended is [Lambda Labs](https://lambdalabs.com/). This is a relatively involved process.

See https://github.com/avaer/ai-cluster/

After the cluser is set up, you will need to set the `AI_PROXY_HOST` environment variable in your Vercel client deployment.

---

# Environment variables

Environment variables can be configured locally for development, or on the Vercel production deployment.

## Development

Add your environment variables to a file named `.env` in the repo root:

### `.env`

```bash
VITE_MULTIPLAYER_HOST="https://multiplayer.isekai.chat/"
VITE_AI_PROXY_HOST="https://ai-proxy.isekai.chat/"
VITE_SUPABASE_URL="https://friddlbqibjnxjoxeocc.supabase.co"
VITE_SUPABASE_PUBLIC_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyaWRkbGJxaWJqbnhqb3hlb2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODkwNjMxMjcsImV4cCI6MjAwNDYzOTEyN30.cP4pmsmvztz-In-xHxVGXpjU-2vEnNKxxKiGV2R7irw"
VITE_PAYMENTS_ENDPOINT="https://payments.isekai.chat";
```

If any environment variable is not specified, a default will be used.

Note the `VITE_` prefix, which is needed for `vite` to puch up these variables in `import.meta.env`.

Fill in with your own details. Then restart your dev server.

## Production

The same environment variables can be added in your Vercel production deployment.

---

# Custom domains

## Client

For the client, configure the custom domain using the Vercel UI. It should just work (tm).

## Backends

Backend workers custom domains are configured via the CloudFlare UI. Note that if you update these, you must point the client to use them, by setting environment variables. See above.

## Development certificates

We have Let's Encrypt/`certbot` based certificates for `https://local.*` in the `certs-local` directory.

These are only useful for development, as the domains pointed to resolve exclusively to `127.0.0.1` in the DNS. HTTPS is required for development, since a great many browser features we use depend on the browser having a secure connection to the server.

These certificates must be previodically refreshed and committed. There is a script to do so in `scripts/gen-certs.sh`.

## Member of M3 Metaverse Makers

<a href="https://3d.m3org.com/">
  <img src="./packages/docs/m3.jpg" width=100% />
  <br />
</a>
<div align="center"><a href="https://3d.m3org.com/">https://m3org.com/</a></div>
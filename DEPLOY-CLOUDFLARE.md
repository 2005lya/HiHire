# Deploy HiHire on Cloudflare Workers and D1

Run these commands from the HiHire project directory. The React app and the API use the same Worker URL. The existing Node.js server and its local SQLite database still work for local development.

## 1. Run the Worker locally

```sh
npm ci
npm --prefix client ci
npm --prefix client run build
npx wrangler d1 migrations apply hihire-bookings --local
```

Create a local `.dev.vars` file with a test admin password and pickup address:

```dotenv
ADMIN_API_KEY="YOUR_LOCAL_TEST_PASSWORD"
PICKUP_ADDRESS="Test pickup address"
```

Run `npx wrangler dev` and open the URL shown in the terminal. Local D1 is separate from `database/hihire.sqlite` and any production database. Without Gmail API credentials, online bookings save but report a confirmation email failure.

## 2. Create the production database

```sh
npx wrangler login
npx wrangler d1 create hihire-bookings
```

In `wrangler.jsonc`, replace the all-zero `database_id` with the ID returned by Cloudflare. Keep the binding name as `DB`. Then apply the schema:

```sh
npx wrangler d1 migrations apply hihire-bookings --remote
```

If you are moving existing bookings, stop accepting bookings on the old service before exporting. Export and import the records before sharing the new URL:

```sh
(
  umask 077
  sqlite3 -readonly -header -cmd '.mode insert bookings' database/hihire.sqlite \
    'SELECT id, email, name, phone, productId, productName, startDate, endDate, pickupTime, rentalDays, rentalCost, deposit, total, currency, status, createdAt FROM bookings;' \
    > booking-data.sql
)
npx wrangler d1 execute hihire-bookings --remote --file=booking-data.sql
npx wrangler d1 execute hihire-bookings --remote --command='SELECT status, COUNT(*) AS count FROM bookings GROUP BY status;'
```

The export contains customer contact details. Keep it private and import it once into the new database. Compare the counts to the old database before switching customers over.

## 3. Configure Gmail

1. In Google Cloud, enable the Gmail API and configure the OAuth consent screen for the sending account.
2. Create a Web application OAuth client. To use [OAuth Playground](https://developers.google.com/oauthplayground/), add `https://developers.google.com/oauthplayground` as an authorized redirect URI.
3. In OAuth Playground settings, turn on **Use your own OAuth credentials** and enter your client ID and client secret. Authorize the `https://www.googleapis.com/auth/gmail.send` scope using the Gmail account HiHire should send from. Exchange the authorization code for tokens and save the refresh token.
4. For ongoing use, review Google's OAuth publishing and verification requirements. External apps in Testing receive Gmail refresh tokens that expire after seven days. Obtain a fresh token after changing the publishing status.

Create a private local file named `.env.worker` for the deployment:

```dotenv
ADMIN_API_KEY="YOUR_ADMIN_PASSWORD"
PICKUP_ADDRESS="YOUR_PICKUP_ADDRESS"
GMAIL_SENDER="YOUR_GMAIL_ADDRESS"
GMAIL_CLIENT_ID="YOUR_GOOGLE_OAUTH_CLIENT_ID"
GMAIL_CLIENT_SECRET="YOUR_GOOGLE_OAUTH_CLIENT_SECRET"
GMAIL_REFRESH_TOKEN="YOUR_GOOGLE_OAUTH_REFRESH_TOKEN"
```

Use the Gmail address you authorized as `GMAIL_SENDER`. The existing Gmail SMTP app password is separate from these credentials. Keep `.env.worker` out of Git and never place these values in React or Wrangler's public configuration.

## 4. Publish and check

```sh
npm --prefix client run build
npx wrangler deploy --secrets-file .env.worker
```

If prompted, register your account's free `workers.dev` subdomain. Open the HTTPS URL Wrangler returns. Before giving it to customers, check that the calendar shows existing bookings, the admin password works, and a test online booking sends an email to your own inbox. Cancel the test booking in the admin panel afterward.

References: [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Gmail send API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send).

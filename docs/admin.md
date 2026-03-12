# Admin

## Promoting a user to admin

Run the promote script with a user's UUID. It displays the user's name, ID, and linked identifiers (Google/email), then prompts for confirmation before inserting into `adminUsers`.

```sh
npx tsx ./scripts/promote-admin.ts <user-uuid>
```

> Find your user UUID at `GET /api/auth/user`.

The script exits early if the user is already an admin.

## Admin routes

Accessible only to users in the `adminUsers` table.

| Route          | Description                                                         |
| -------------- | ------------------------------------------------------------------- |
| `/admin`       | Admin dashboard                                                     |
| `/admin/users` | Lists all users with name, identifiers, admin status, and join date |

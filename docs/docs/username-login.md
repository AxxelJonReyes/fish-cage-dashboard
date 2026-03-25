# Username + Password Login (Supabase)

This project uses Supabase Auth for sessions, but the UI allows users to log in with a **username** (instead of typing an email).

Under the hood, Supabase still authenticates with `email + password`. We resolve `username -> email` using a Supabase SQL function (RPC).

## 1) Database changes (run in Supabase SQL Editor)

### Add `username` to `public.profiles` and make it unique (case-insensitive)

```sql
alter table public.profiles
add column if not exists username text;

create unique index if not exists profiles_username_unique
on public.profiles (lower(username));
```

### Create RPC function: `get_email_for_username(username) -> email`

```sql
create or replace function public.get_email_for_username(p_username text)
returns text
language sql
security definer
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;

revoke all on function public.get_email_for_username(text) from public;
grant execute on function public.get_email_for_username(text) to anon, authenticated;
```

## 2) App changes

The login form (`app/login/LoginForm.tsx`) should:
1. Call `get_email_for_username(username)` to retrieve the user's email.
2. Call `supabase.auth.signInWithPassword({ email, password })`.

To reduce username enumeration risk, the UI should show a generic message like:
- `Invalid username or password`

## 3) User management notes

- Supabase Auth still requires an email internally (it can be a placeholder email).
- Ensure each Auth user has a matching row in `public.profiles` with:
  - `profiles.id = auth.users.id`
  - `profiles.username` set (e.g. `axxel`)

## 4) Testing

SQL test:
```sql
select public.get_email_for_username('axxel');
```

App test:
- Log out
- Log in with `username: axxel` + password
- Confirm redirect to `/dashboard`

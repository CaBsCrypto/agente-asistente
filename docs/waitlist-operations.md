# Waitlist operations

The public waitlist is intentionally durable-only. It does not fall back to memory or browser storage.

## Activate Neon

1. Create or connect the Neon project.
2. Add `DATABASE_URL` to local `.env.local` and every Vercel environment.
3. Run `npm run db:migrate` once against the target database.
4. Redeploy and submit a test signup.

Duplicate emails are ignored by a unique database index. The API stores no IP address.

## YC metrics queries

```sql
select count(*) as total_signups
from waitlist_signups
where status = 'waiting';

select role, count(*) as signups
from waitlist_signups
group by role
order by signups desc;

select use_case, count(*) as signups
from waitlist_signups
group by use_case
order by signups desc;

select date_trunc('day', created_at) as day, count(*) as signups
from waitlist_signups
group by day
order by day;

select source, referral, count(*) as signups
from waitlist_signups
group by source, referral
order by signups desc;
```
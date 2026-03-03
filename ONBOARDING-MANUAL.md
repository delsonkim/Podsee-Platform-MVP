# Podsee Centre Dashboard — Onboarding Manual

This guide explains how the Centre Dashboard works and how to onboard a new centre onto Podsee.

---

## What the Centre Dashboard Is

Every centre on Podsee gets their own private dashboard where they can:

- See how many trial bookings Podsee has sent them (all time + this month)
- View booking details — parent name, child name, level, trial date, status
- Check trial slot capacity — how many spots are filled vs available

They access it by signing in with their Google account at **podsee-trial-platform.vercel.app/centre-dashboard**.

---

## How to Onboard a New Centre

### Option A: Via the Add Centre Form (Recommended)

When you add a new centre through the admin panel, the centre owner is automatically set up for dashboard access.

1. Go to **podsee-trial-platform.vercel.app/admin/centres/new**
2. In Step 1 (Basic Info), fill in the **Centre Owner Email** field with the centre owner's Google email address
   - This must be the Gmail or Google Workspace email they will sign in with
   - Example: `owner@mathproacademy.com` or `john.tan@gmail.com`
3. Complete the rest of the form as usual and click **Create Centre**
4. What happens automatically:
   - A centre dashboard account is created for that email (status: **Pending**)
   - An invite email is sent to the centre owner with a link to sign in

The centre owner then simply clicks the link in the email and signs in with Google. That's it — they land on their dashboard.

### Option B: Manually Link an Existing Centre

For centres already on Podsee that don't have dashboard access yet:

1. Go to **podsee-trial-platform.vercel.app/admin/centre-users**
2. Fill in the form:
   - **Google Email**: The centre owner's Google email
   - **Centre**: Select their centre from the dropdown
   - **Role**: Choose `Owner` (or `Staff` for additional team members)
3. Click **Link User**
4. Tell the centre owner to visit **podsee-trial-platform.vercel.app/centre-dashboard** and sign in with Google

> **Note:** The centre owner must sign in with the exact Google email you entered. If they use a different email, it won't match.

---

## What the Centre Owner Sees

### Overview Page (`/centre-dashboard`)
- **Leads from Podsee** — total trial bookings sent to their centre, all time and this month
- **Status breakdown** — how many bookings are Pending, Confirmed, Completed, etc.
- **Upcoming Trials** — next 5 trial slots with a capacity bar showing spots filled
- **Recent Bookings** — last 10 bookings with parent name, child, date, and status

### Bookings Page (`/centre-dashboard/bookings`)
- Full list of all bookings for their centre
- Filter by status tabs: All, Pending, Confirmed, Completed, Converted, No Show, Cancelled
- Click any booking reference to see full details (parent contact info, child info, trial slot info)

### Trial Slots Page (`/centre-dashboard/slots`)
- All upcoming trial slots with capacity bars (green = available, amber = filling up, red = full)
- Shows subject, level, date, time, fee, and spots remaining
- Past slots section at the bottom (last 20)

---

## How Sign-In Works (Behind the Scenes)

1. Centre owner clicks "Sign in with Google" on the Podsee site
2. After Google authentication, Podsee checks if their email matches a centre account
3. If it does, they are automatically redirected to their centre dashboard
4. If they've never signed in before, their account is linked on first login — no extra steps needed

The centre owner uses the same Google sign-in button as parents. The system automatically detects whether they are a parent or a centre user and sends them to the right place.

---

## Managing Centre Users

### View All Centre Users
Go to **podsee-trial-platform.vercel.app/admin/centre-users** to see:
- All linked centre users with their email, centre, role, and link status
- **Yes** (green) = they've signed in at least once
- **Pending** (amber) = account created but they haven't signed in yet

### Add Staff Members
A centre can have multiple users (e.g. owner + staff). Use the admin centre-users page to link additional Google emails to the same centre with the `Staff` role.

### Remove a Centre User
Click the **Remove** button next to any user on the admin centre-users page. They will lose dashboard access immediately.

---

## FAQ

**Q: The centre owner says they can't access the dashboard.**
Check:
1. Are they signing in with the correct Google email? (Must match exactly what you entered)
2. Is there a record for them on `/admin/centre-users`? If not, add one.
3. Is their status showing "Pending"? Ask them to sign in — it should link automatically.

**Q: Can a centre owner see other centres' data?**
No. Every query is filtered by their centre ID. They can only see bookings and slots that belong to their centre.

**Q: What if the centre owner changes their email?**
Remove the old email from `/admin/centre-users` and add the new one. They'll need to sign in again with the new Google account.

**Q: Does the centre owner need to create a password?**
No. They sign in with Google — no passwords to manage.

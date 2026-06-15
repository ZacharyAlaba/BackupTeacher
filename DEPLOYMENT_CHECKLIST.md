# Supabase → Vercel Deployment Checklist

## Pre-Deployment (Do Once)

### Supabase Setup
- [ ] Create account at https://supabase.com
- [ ] Create new project
- [ ] Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Copy Publishable Key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] Copy Service Role Key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)
- [ ] In Supabase dashboard → SQL Editor → Create new query
- [ ] Copy all content from `supabase/migrations/0001_create_schema.sql`
- [ ] Paste into SQL editor and click "Run"
- [ ] Verify all tables created in "Tables" section

### Local Testing
- [ ] Create `.env.local` with Supabase credentials
- [ ] Run `npm install` (installs csv-parse, nanoid)
- [ ] Run `npm run seed:supabase`
- [ ] Verify seeding completed successfully
- [ ] Run `npm run dev`
- [ ] Test login: admin@school.edu / admin123
- [ ] Verify home page loads
- [ ] Check admin dashboard loads
- [ ] Test at least one admin route

### GitHub Setup
- [ ] Commit all changes: `git add .` & `git commit -m "Supabase migration"`
- [ ] Push to GitHub: `git push`
- [ ] Verify push successful

---

## Deployment to Vercel

### Step 1: Link Repository
- [ ] Go to https://vercel.com/dashboard
- [ ] Click "Add New" → "Project"
- [ ] Import GitHub repository
- [ ] Select the correct branch (main/master)
- [ ] Click "Import"

### Step 2: Environment Variables
In Vercel project settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL = your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = your-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key (mark as Secret)
NEXTAUTH_SECRET = generate-with: openssl rand -base64 32
NEXTAUTH_URL = https://your-domain.vercel.app
```

- [ ] Add all 5 variables
- [ ] Double-check SUPABASE_SERVICE_ROLE_KEY is marked as Secret
- [ ] Save environment variables

### Step 3: Build Configuration
- [ ] Framework: Next.js (should auto-detect)
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`
- [ ] Install Command: `npm install`
- [ ] Leave Root Directory blank
- [ ] Click "Deploy"

### Step 4: Wait for Deployment
- [ ] Watch build logs in Vercel dashboard
- [ ] Should complete in 2-3 minutes
- [ ] Check for any errors in build log
- [ ] Vercel provides a preview URL

---

## Post-Deployment Testing

### Basic Functionality
- [ ] Visit your Vercel deployment URL
- [ ] Check if page loads
- [ ] Try logging in as admin
- [ ] Verify login works
- [ ] Check dashboard loads
- [ ] Check at least one page loads from database

### Check Logs
In Vercel dashboard:
- [ ] Go to "Deployments" → Most recent
- [ ] Click "Logs" tab
- [ ] Look for any errors (should see successful build)
- [ ] Check Function logs for any API errors
- [ ] Scroll through and verify no 500 errors

### Supabase Connection
- [ ] In Supabase dashboard → Tables
- [ ] Verify tables exist and have data
- [ ] Check "User" table has admin user
- [ ] Check "Teacher", "Student", "Section" tables have seed data
- [ ] Check "TimeSlot", "Subject" tables populated from CSV

---

## Troubleshooting

### Build Failed
- [ ] Check build log for specific error
- [ ] Common: Missing dependencies → Run `npm install` locally
- [ ] Common: Wrong env var names → Copy exactly as shown above
- [ ] Retry deployment after fixing

### Login Not Working
- [ ] Verify `NEXTAUTH_SECRET` is set in Vercel
- [ ] Verify `NEXTAUTH_URL` matches your domain
- [ ] Check Supabase credentials in Vercel env vars
- [ ] Try test credentials: admin@school.edu / admin123

### Database Connection Error
- [ ] Check Supabase project is "Running" (not paused)
- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` has no typos
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is correct (not publishable key)
- [ ] Check in Supabase dashboard that tables exist

### Slow Response
- [ ] Check Supabase project region matches your area
- [ ] Check if Supabase project is on free tier (has rate limits)
- [ ] Monitor Supabase usage in dashboard

---

## Domain Setup (Optional)

To use custom domain instead of `*.vercel.app`:

1. [ ] In Vercel → Settings → Domains
2. [ ] Click "Add Domain"
3. [ ] Enter your domain name
4. [ ] Follow DNS instructions provided by Vercel
5. [ ] Wait for DNS propagation (up to 48 hours)
6. [ ] Verify domain works
7. [ ] Update `NEXTAUTH_URL` to your domain if changed

---

## Production Best Practices

- [ ] Enable Vercel automatic deployments
- [ ] Set up branch protections on GitHub
- [ ] Enable Supabase backups in dashboard
- [ ] Monitor Supabase logs regularly
- [ ] Set up email alerts for errors
- [ ] Keep `.env` variables in Vercel (never in code)
- [ ] Test with production data monthly

---

## Rollback Plan

If deployment fails:

1. [ ] Check Vercel build logs for specific error
2. [ ] Fix issue locally
3. [ ] Push fixed code to GitHub
4. [ ] Vercel will automatically redeploy
5. [ ] Or manually trigger redeploy from Vercel dashboard

If database issue:

1. [ ] Check Supabase dashboard → Tables
2. [ ] Verify tables have correct structure
3. [ ] Check for constraint errors
4. [ ] Re-run seed script if data missing
5. [ ] Contact Supabase support if persists

---

## Success Criteria

✅ Deployment successful when:
- Website loads on Vercel URL
- Login works with test credentials
- Admin dashboard loads
- No console errors
- Database queries work
- Can see data from Supabase

🎉 You're live!

---

## Next Steps After Deployment

1. **Monitor**: Check Vercel dashboard daily first week
2. **Convert remaining routes**: Update Prisma → Supabase gradually
3. **Remove Prisma**: Once all routes converted, uninstall Prisma
4. **Optimize**: Set up caching, CDN, etc.
5. **Scale**: Monitor usage and upgrade Supabase tier if needed

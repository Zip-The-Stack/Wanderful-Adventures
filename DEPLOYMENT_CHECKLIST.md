# Deployment Checklist

Use this checklist before deploying to production on Cloudflare Workers.

## Pre-Deployment

### Code Quality

- [ ] All tests passing (`bun run test` if tests exist)
- [ ] Linter passing (`bun run lint`)
- [ ] No console errors or warnings
- [ ] All TODO/FIXME comments addressed
- [ ] Code formatted (`bun run format`)

### Environment & Configuration

- [ ] `.env.production` properly configured
- [ ] All required secrets set in Cloudflare dashboard
- [ ] Supabase project is not paused
- [ ] Database migrations are up to date
- [ ] CORS settings properly configured in Supabase

### Testing

- [ ] Manual testing on `npm run preview` passed
- [ ] All user flows tested end-to-end
- [ ] Authentication flows work correctly
- [ ] File uploads working
- [ ] Map functionality verified
- [ ] Mobile responsive design tested
- [ ] Different browsers tested (Chrome, Firefox, Safari)

### Performance

- [ ] Bundle size reasonable (check with `bun run build`)
- [ ] Images optimized
- [ ] No unnecessary dependencies
- [ ] Database queries optimized
- [ ] Lighthouse score acceptable (run in DevTools)

### Security

- [ ] No hardcoded secrets
- [ ] Environment variables properly used
- [ ] RLS policies enabled in Supabase
- [ ] HTTPS enforced
- [ ] CORS properly restricted
- [ ] Input validation in place
- [ ] SQL injection protection verified

### Documentation

- [ ] README.md up to date
- [ ] API documentation current
- [ ] Deployment instructions clear
- [ ] Troubleshooting guide complete

## Deployment Steps

1. **Final Build Test**

   ```bash
   bun run build
   bun run preview
   ```

2. **Deploy to Cloudflare**

   ```bash
   bunx wrangler deploy
   ```

3. **Verify Deployment**
   - [ ] Visit production URL
   - [ ] Check console for errors
   - [ ] Test main functionality
   - [ ] Verify environment variables loaded
   - [ ] Check database connectivity

4. **Post-Deployment**
   - [ ] Monitor error logs (`bunx wrangler tail`)
   - [ ] Check Supabase logs for issues
   - [ ] Verify analytics/monitoring working
   - [ ] Communicate deployment to team

## Rollback Plan

If issues occur after deployment:

```bash
# View deployment history
bunx wrangler deployments list

# View specific deployment
bunx wrangler deployments view <deployment-id>

# Redeploy previous version
git checkout <previous-commit>
bun run build
bunx wrangler deploy
```

## Common Issues & Solutions

### Deployment Fails

- Check `wrangler.jsonc` syntax
- Verify all required env vars set
- Check Cloudflare API token validity
- Review build logs

### App Not Loading

- Check browser console for errors
- Verify environment variables loaded correctly
- Check Wrangler logs: `bunx wrangler tail`
- Ensure Supabase project is active

### Database Connection Issues

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check RLS policies allow operations
- Verify Supabase project not paused
- Check network requests in browser DevTools

### Performance Issues

- Check Lighthouse scores
- Review Cloudflare analytics
- Monitor database query times
- Optimize images and assets

## Scheduled Maintenance

- **Weekly**: Check error logs and performance metrics
- **Monthly**: Review dependency updates
- **Quarterly**: Full security audit
- **Annually**: Database optimization and cleanup

---

**Last Reviewed**: May 5, 2026

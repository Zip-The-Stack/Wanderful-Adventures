# GitHub Actions Secrets Setup

For automatic deployment via GitHub Actions, you need to configure secrets in your GitHub repository.

## Steps to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

## Required Secrets

### Cloudflare Authentication

```
Name: CLOUDFLARE_API_TOKEN
Value: Your Cloudflare API token
Get it from: https://dash.cloudflare.com/profile/api-tokens
```

```
Name: CLOUDFLARE_ACCOUNT_ID
Value: Your Cloudflare Account ID
Get it from: https://dash.cloudflare.com (shown on dashboard)
```

### Supabase

```
Name: VITE_SUPABASE_URL
Value: https://wtudcdjceuawacrowdhi.supabase.co
Get it from: Supabase Dashboard → Project Settings → API
```

```
Name: VITE_SUPABASE_ANON_KEY
Value: Your Supabase anon key
Get it from: Supabase Dashboard → Project Settings → API → anon key
```

## How Secrets Work

- Secrets are **encrypted** and only accessible to GitHub Actions
- They are **never** exposed in logs or build output
- They are **only** used when needed (e.g., during deployment)
- Each secret is referenced as `${{ secrets.SECRET_NAME }}`

## Verification

After adding secrets:

1. Create a test PR or push to `main`
2. Go to **Actions** tab in GitHub
3. Click on the workflow run
4. Check that the deployment succeeded

## Rotating Secrets

To update a secret (e.g., if a key is compromised):

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click the secret you want to update
3. Click **Update**
4. Paste the new value
5. Future deployments will use the new value

## Troubleshooting Deployment Failures

### "Failed to deploy" error

- Verify all secrets are set correctly
- Check secret names match exactly (case-sensitive)
- Ensure `CLOUDFLARE_API_TOKEN` is valid and not expired

### "Build failed" error

- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Verify Supabase project is not paused
- Review build logs in GitHub Actions

### Secrets not being used

- Restart the workflow by pushing again
- Check that workflow file references correct secret names
- Verify the secret is on the correct repository (not organization-wide)

## Best Practices

1. **Rotate keys regularly** - Update API tokens every 90 days
2. **Principle of least privilege** - Use limited-scope API tokens
3. **Monitor usage** - Check GitHub Actions logs regularly
4. **Never commit secrets** - Keep `.env.local` in `.gitignore`
5. **Use different keys per environment** - Dev, staging, and production

## Environment-Specific Setup (Optional)

For more control, you can use environment secrets:

1. Go to **Settings** → **Environments**
2. Create environments: `development`, `staging`, `production`
3. Add secrets specific to each environment
4. Modify workflows to use specific environments

Example:

```yaml
deploy:
  environment: production
  # Now uses production-specific secrets
```

## Support

For issues with secrets or GitHub Actions:

- GitHub Docs: https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions
- Cloudflare API Token: https://dash.cloudflare.com/profile/api-tokens
- Supabase API Keys: https://supabase.com/docs/guides/api

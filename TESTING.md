# Testing Fix-it Felix

This document explains how to test the Fix-it Felix action both locally and in CI.

## Local Testing

### Quick Test

```bash
# Install dependencies and build
npm install
npm run build

# Run the test script
node test-felix.js
```

### Manual Testing with Different Scenarios

1. **Test with regular commit:**

```bash
git config user.name "Your Name"
echo "test" >> test-files/ci-test.js
git add test-files/ci-test.js
git commit -m "test: regular commit"
node test-felix.js  # Should skip due to infinite loop protection
```

2. **Test with allowed bot:**

```bash
git config user.name "dependabot[bot]"
echo "test2" >> test-files/ci-test.js
git add test-files/ci-test.js
git commit -m "chore: dependency update"
node test-felix.js  # Should proceed with fixes
```

3. **Reset git config:**

```bash
git config --local --unset user.name
git config --local --unset user.email
```

## CI Testing

### Automatic Testing on PRs

The action is automatically tested on PRs when files in `test-files/`, `src/`, or `dist/` are modified:

- **Dry Run Test**: Always runs on PRs, posts results as comments
- **Commit Test**: Only runs on PRs from branch `test-felix-commit`

### Manual Bot Testing

Test the allowed_bots feature using the manual workflow:

1. Go to **Actions** → **Test Allowed Bots Feature**
2. Click **Run workflow**
3. Enter a bot name (e.g., `dependabot`, `renovate`, `github-actions`)
4. Click **Run workflow**

This will:

- Create a test file with formatting issues
- Commit as the specified bot
- Run Felix to test if it respects the allowed_bots configuration
- Clean up test files

### Testing Scenarios

#### Scenario 1: Test Dry Run Mode

Create a PR with changes to `test-files/ci-test.js` to trigger the dry-run workflow.

#### Scenario 2: Test Commit Mode

1. Create a branch named `test-felix-commit`
2. Add formatting issues to files in `test-files/`
3. Create a PR - Felix will commit fixes directly

#### Scenario 3: Test Allowed Bots

1. Use the manual workflow to simulate commits from different bots
2. Verify Felix runs for allowed bots and skips for others

## Expected Behavior

### When Felix Should Skip

- Last commit author contains: `fix-it-felix`, `felix`, `github-actions`, `bot` (but not in allowed_bots)
- Last commit message contains: `Fix-it Felix`

### When Felix Should Proceed

- Last commit author is in the `allowed_bots` list
- Last commit is from a regular user (not a bot)
- Repository has formatting/linting issues to fix

### Outputs to Check

- **Dry Run**: Check PR comments for proposed changes
- **Commit Mode**: Check for new commits with fixes
- **Logs**: Check workflow logs for bot detection messages

## Troubleshooting

### Common Issues

1. **"No fixes needed"**: Files are already properly formatted
2. **Syntax errors**: Fix syntax errors in test files before running formatters
3. **Permission errors**: Ensure `GITHUB_TOKEN` has write permissions

### Debug Tips

- Check workflow logs for detailed execution information
- Look for messages like "Last commit was by allowed bot: X"
- Verify the `allowed_bots` configuration matches bot names exactly

# 🛠️ Fix-it Felix - GitHub Action

![](./images/felix.webp)

**Fix-it Felix** is a GitHub Action that automatically fixes minor code quality issues (linting, formatting) in pull requests. It's designed to be configurable, safe, and work across multiple repositories in your organization.

## ✨ Features

- 🔧 **Multiple Fixers**: Support for ESLint, Prettier, and Markdownlint
- 🎨 **Custom Commands**: Use your own npm scripts or custom commands
- ⚙️ **Configurable**: Per-repository configuration via `.felixrc.json`
- 🤖 **Auto-commit**: Automatically commits fixes to PR branches
- 🛡️ **Safety First**: Built-in safeguards against infinite loops
- 🔍 **Dry-run Mode**: Preview changes without committing
- 🚫 **Skip Control**: Label-based opt-out mechanism
- 🍴 **Fork Friendly**: Handles forked PRs gracefully

## 🚀 Quick Start

### Basic Usage

Create `.github/workflows/fix-it-felix.yml` in your repository:

```yaml
name: Fix-it Felix

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  autofix:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Fix-it Felix
        uses: launchdarkly-labs/fix-it-felix@v1
        with:
          fixers: 'eslint,prettier'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 📖 Inputs

| Input            | Description                                                | Required | Default                                           |
| ---------------- | ---------------------------------------------------------- | -------- | ------------------------------------------------- |
| `fixers`         | Comma-separated list of fixers to run                      | No       | `eslint,prettier`                                 |
| `commit_message` | Commit message for auto-fix commits                        | No       | `🤖 Fix-it Felix: Auto-fixed code quality issues` |
| `config_path`    | Path to Felix configuration file                           | No       | `.felixrc.json`                                   |
| `dry_run`        | Run in dry-run mode (comment instead of commit)            | No       | `false`                                           |
| `skip_label`     | PR label that skips Felix processing                       | No       | `skip-felix`                                      |
| `allowed_bots`   | Comma-separated list of bot names Felix should run against | No       | ``                                                |
| `paths`          | Comma-separated list of paths to run fixers on             | No       | `.`                                               |

## 📤 Outputs

| Output          | Description                                      |
| --------------- | ------------------------------------------------ |
| `fixes_applied` | Whether any fixes were applied (`true`/`false`)  |
| `changed_files` | Comma-separated list of files that were modified |

## 🔧 Supported Fixers

### ESLint

- **Default Command**: `npx eslint --fix .`
- **Extensions**: `.js`, `.jsx`, `.ts`, `.tsx`, `.vue`
- **Config**: Respects existing ESLint configuration
- **Custom Commands**: Override with your own npm scripts or commands

### Prettier

- **Default Command**: `npx prettier --write`
- **Extensions**: `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.scss`, `.md`, `.yml`, `.yaml`
- **Config**: Respects existing Prettier configuration
- **Custom Commands**: Override with your own npm scripts or commands

### Markdownlint

- **Default Command**: `npx markdownlint-cli2 --fix`
- **Extensions**: `.md`, `.markdown`
- **Config**: Respects existing Markdownlint configuration
- **Custom Commands**: Override with your own npm scripts or commands

## ⚙️ Configuration

### Action Inputs Configuration

```yaml
- name: Run Fix-it Felix
  uses: launchdarkly-labs/fix-it-felix@v1
  with:
    fixers: 'eslint,prettier,markdownlint'
    paths: 'src,docs'
    commit_message: '🤖 Custom commit message'
    config_path: '.custom-felix.json'
    dry_run: false
    skip_label: 'no-autofix'
```

### Path Configuration

You can control which directories Felix processes:

**Global Paths (affects all fixers):**

```yaml
with:
  paths: 'src,docs,scripts' # Only process these directories
```

**Per-Fixer Paths (in `.felixrc.json`):**

```json
{
  "paths": ["src", "docs"], // Global default
  "prettier": {
    "paths": ["src", "docs", "examples"] // Prettier-specific paths
  },
  "eslint": {
    "paths": ["src", "scripts"] // ESLint-specific paths
  }
}
```

**Path Examples:**

- `"."` - Current directory (recursive)
- `"src"` - Only the src directory (recursive)
- `"src,docs"` - Both src and docs directories
- `["docs", "README.md"]` - Specific directory and file

### Custom Commands

Felix supports using custom commands instead of the built-in tool commands. This is useful for:

- Using your existing npm scripts with custom configurations
- Running tools through build systems or custom wrappers
- Using different versions or forks of linting tools

**Basic Custom Command:**

```json
{
  "eslint": {
    "command": ["npm", "run", "lint:fix"]
  },
  "prettier": {
    "command": ["npm", "run", "format"]
  }
}
```

**Path Handling:**

By default, Felix appends file paths to custom commands for performance. You can control this behavior:

```json
{
  "eslint": {
    "command": ["npm", "run", "lint:fix"],
    "appendPaths": true // Default: append paths like "src docs"
  },
  "prettier": {
    "command": ["npm", "run", "format"],
    "appendPaths": false // Don't append paths, run global command
  }
}
```

**Examples:**

- `appendPaths: true` → `npm run format src docs` (faster, processes only specified files)
- `appendPaths: false` → `npm run format` (runs your script as-is)

**Usage with npm scripts that accept path arguments:**

```json
// package.json
{
  "scripts": {
    "lint:fix": "eslint --fix",
    "format": "prettier --write"
  }
}

// .felixrc.json
{
  "eslint": {
    "command": ["npm", "run", "lint:fix"],
    "appendPaths": true  // Results in: npm run lint:fix src tests
  }
}
```

**Usage with npm scripts that define their own paths:**

```json
// package.json
{
  "scripts": {
    "format:all": "prettier --write 'src/**/*.{js,ts}' 'docs/**/*.md'"
  }
}

// .felixrc.json
{
  "prettier": {
    "command": ["npm", "run", "format:all"],
    "appendPaths": false  // Results in: npm run format:all
  }
}
```

### Repository Configuration (`.felixrc.json`)

Create a `.felixrc.json` file in your repository root for advanced configuration:

```json
{
  "fixers": ["eslint", "prettier", "markdownlint"],
  "paths": ["src/**/*", "docs/**/*"],
  "ignore": ["node_modules/**", "dist/**", "build/**", "coverage/**", "*.min.js"],
  "eslint": {
    "configFile": ".eslintrc.js",
    "extensions": [".js", ".jsx", ".ts", ".tsx"],
    "command": ["npm", "run", "lint:fix"],
    "appendPaths": true
  },
  "prettier": {
    "configFile": ".prettierrc",
    "extensions": [".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".scss", ".md"],
    "command": ["npm", "run", "format"],
    "appendPaths": false
  },
  "markdownlint": {
    "configFile": ".markdownlint.json",
    "command": ["npm", "run", "lint:markdown"]
  }
}
```

### Configuration Priority

1. `.felixrc.json` (if present)
2. Action inputs
3. Default values

## 🛡️ Safety Features

### Infinite Loop Protection

- Detects commits made by Felix or other bots
- Skips processing if last commit was automated
- Prevents endless fix-commit cycles
- **Exception**: Bots listed in `allowed_bots` will bypass this protection

### Fork Handling

- Automatically detects forked PRs
- Skips processing (cannot commit to forks with default token)
- Logs appropriate messages

### Skip Mechanisms

- **Label-based**: Add `skip-felix` label to PR
- **Configuration**: Set `fixers: []` in `.felixrc.json`
- **Event-based**: Only runs on specific PR events

## 🔍 Dry-run Mode

Test Felix without committing changes:

```yaml
- name: Run Fix-it Felix (Dry Run)
  uses: launchdarkly-labs/fix-it-felix@v1
  with:
    fixers: 'eslint,prettier'
    dry_run: true
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

In dry-run mode, Felix will:

- Run all configured fixers
- Generate a PR comment with proposed changes
- Not commit or push any changes

## 📝 Examples

See the [`examples/`](examples/) directory for more workflow examples:

- [`basic-usage.yml`](examples/basic-usage.yml) - Simple setup
- [`advanced-usage.yml`](examples/advanced-usage.yml) - Advanced configuration with dry-run for drafts
- [`.felixrc.json`](examples/.felixrc.json) - Example configuration file

## 🔧 Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Package for Release

```bash
npm run package
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests if applicable
4. Run `npm run package` to update the distribution
5. Submit a pull request

## 🎯 Roadmap

- [ ] Support for more fixers (stylelint, gofmt, black, etc.)
- [x] ~~Custom fixer support~~ ✅ **Completed** - Use custom commands
- [ ] Monorepo support
- [ ] Slack/Discord notifications
- [ ] Performance optimizations

---

**Made with ❤️ by LaunchDarkly**

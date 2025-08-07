# Configuration Guide

This guide covers all configuration options for Fix-it Felix.

## ⚠️ Important: Install Dependencies First

**Felix requires dependencies to be installed before it runs.** This ensures:

- ✅ **Version consistency** - Uses your project's exact tool versions
- ✅ **Config compatibility** - ESLint/Prettier plugins work correctly  
- ✅ **Custom commands work** - npm scripts have access to dependencies

**Always include `npm ci` (or `yarn install`) before Felix in your workflow:**

```yaml
- name: Install dependencies
  run: npm ci
  
- name: Run Fix-it Felix
  uses: launchdarkly-labs/fix-it-felix@v1
```

## Configuration Sources

Configuration is loaded in this priority order:

1. **`.felixrc.json`** (repository-specific configuration)
2. **Action inputs** (workflow configuration)
3. **Default values**

## Action Inputs

Configure Felix behavior through GitHub Action inputs:

| Input            | Description                                                | Default                                           |
| ---------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| `fixers`         | Comma-separated list of fixers to run                     | `eslint,prettier`                                 |
| `paths`          | Comma-separated list of paths to process                  | `.` (current directory)                           |
| `commit_message` | Commit message for auto-fix commits                       | `🤖 Fix-it Felix: Auto-fixed code quality issues` |
| `config_path`    | Path to Felix configuration file                          | `.felixrc.json`                                   |
| `dry_run`        | Run in dry-run mode (comment instead of commit)           | `false`                                           |
| `skip_label`     | PR label that skips Felix processing                      | `skip-felix`                                      |
| `allowed_bots`   | Comma-separated list of bot names Felix should run against | (empty)                                           |

### Example

```yaml
steps:
  - name: Checkout
    uses: actions/checkout@v4
    
  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'npm'
      
  # ⚠️ REQUIRED: Install dependencies before Felix
  - name: Install dependencies  
    run: npm ci
    
  - name: Run Fix-it Felix
    uses: launchdarkly-labs/fix-it-felix@v1
    with:
      fixers: 'eslint,prettier,markdownlint'
      paths: 'src,docs,scripts'
      commit_message: '🤖 Auto-fix code issues'
      config_path: '.custom-felix.json'
      dry_run: false
      skip_label: 'no-autofix'
      allowed_bots: 'dependabot,renovate'
```

## Repository Configuration (`.felixrc.json`)

Create a `.felixrc.json` file in your repository root for advanced configuration.

### Basic Configuration

```json
{
  "fixers": ["eslint", "prettier", "markdownlint"],
  "paths": ["src", "docs"],
  "ignore": ["node_modules/**", "dist/**", "build/**"]
}
```

### Global Configuration Options

| Option   | Type       | Description                             | Default |
| -------- | ---------- | --------------------------------------- | ------- |
| `fixers` | `string[]` | List of fixers to run                   | `[]`    |
| `paths`  | `string[]` | Global paths for all fixers             | `["."]` |
| `ignore` | `string[]` | Glob patterns to ignore                 | See below |

**Default ignore patterns:**
```json
["node_modules/**", "dist/**", "build/**", ".git/**"]
```

### Per-Fixer Configuration

Each fixer can be configured with these options:

| Option        | Type       | Description                                  | Default |
| ------------- | ---------- | -------------------------------------------- | ------- |
| `configFile`  | `string`   | Path to fixer's config file                 | (none)  |
| `extensions`  | `string[]` | File extensions to process                   | Built-in defaults |
| `paths`       | `string[]` | Fixer-specific paths (overrides global)     | Global paths |
| `command`     | `string[]` | Custom command to run instead of built-in   | (none)  |
| `appendPaths` | `boolean`  | Whether to append paths to custom commands   | `true`  |

### Examples

#### ESLint Configuration

```json
{
  "eslint": {
    "configFile": ".eslintrc.custom.js",
    "extensions": [".js", ".jsx", ".ts", ".tsx"],
    "paths": ["src", "scripts"],
    "command": ["npm", "run", "lint:fix"],
    "appendPaths": true
  }
}
```

#### Prettier Configuration

```json
{
  "prettier": {
    "configFile": ".prettierrc.json",
    "extensions": [".js", ".jsx", ".ts", ".tsx", ".json", ".md"],
    "paths": ["src", "docs"],
    "command": ["npm", "run", "format"],
    "appendPaths": false
  }
}
```

#### Markdownlint Configuration

```json
{
  "markdownlint": {
    "configFile": ".markdownlint.yml",
    "paths": ["docs", "*.md"],
    "command": ["npm", "run", "lint:markdown"]
  }
}
```

## Path Configuration

### Global Paths

Set paths that apply to all fixers:

```json
{
  "paths": ["src", "docs", "scripts"]
}
```

### Per-Fixer Paths

Override global paths for specific fixers:

```json
{
  "paths": ["src", "docs"],
  "eslint": {
    "paths": ["src", "scripts"]  // ESLint only processes these
  },
  "prettier": {
    "paths": ["src", "docs", "examples"]  // Prettier processes these
  }
}
```

### Path Examples

- `"."` - Current directory (recursive)
- `"src"` - Only the src directory (recursive) 
- `"src/**/*.ts"` - TypeScript files in src (glob pattern)
- `["src", "docs"]` - Multiple directories
- `["README.md", "docs"]` - Specific file and directory

## Custom Commands

Replace built-in fixer commands with your own npm scripts or custom commands.

### Why Use Custom Commands?

- **Use your existing npm scripts** - Leverage existing project setup
- **Ensure version consistency** - Use project's exact tool versions  
- **Support complex configs** - Work with ESLint/Prettier plugins
- **Custom toolchains** - Integrate with monorepos, build systems
- **Environment variables** - Use `NODE_OPTIONS` and custom env vars

**⚠️ Requires dependencies:** Custom commands need `npm ci` to run first.

### Basic Usage

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

### Path Handling

By default, Felix appends file paths to custom commands for performance:

```json
{
  "eslint": {
    "command": ["npm", "run", "lint:fix"],
    "appendPaths": true   // Results in: npm run lint:fix src docs
  }
}
```

Disable path appending for scripts that define their own file patterns:

```json
{
  "prettier": {
    "command": ["npm", "run", "format:all"],
    "appendPaths": false  // Results in: npm run format:all
  }
}
```

### Integration Examples

#### With npm scripts that accept paths

**package.json:**
```json
{
  "scripts": {
    "lint:fix": "eslint --fix",
    "format": "prettier --write"
  }
}
```

**`.felixrc.json`:**
```json
{
  "eslint": {
    "command": ["npm", "run", "lint:fix"],
    "appendPaths": true
  },
  "prettier": {
    "command": ["npm", "run", "format"], 
    "appendPaths": true
  }
}
```

Result: `npm run lint:fix src tests` and `npm run format src tests`

#### With npm scripts that define their own paths

**package.json:**
```json
{
  "scripts": {
    "format:all": "prettier --write 'src/**/*.{js,ts}' 'docs/**/*.md'",
    "lint:project": "eslint src tests --fix"
  }
}
```

**`.felixrc.json`:**
```json
{
  "prettier": {
    "command": ["npm", "run", "format:all"],
    "appendPaths": false
  },
  "eslint": {
    "command": ["npm", "run", "lint:project"],
    "appendPaths": false
  }
}
```

Result: `npm run format:all` and `npm run lint:project`

#### With custom commands

```json
{
  "eslint": {
    "command": ["./scripts/custom-lint.sh", "--fix"],
    "appendPaths": true
  },
  "prettier": {
    "command": ["yarn", "workspace", "@my/tools", "format"],
    "appendPaths": true
  }
}
```

### Security Notes

- Custom commands run in the GitHub Actions environment
- Commands are executed as arrays (safe from shell injection)
- Paths are safely appended as separate arguments
- Felix validates that specified fixers are available before running

## Complete Configuration Example

```json
{
  "fixers": ["eslint", "prettier", "markdownlint"],
  "paths": ["src/**/*", "docs/**/*"],
  "ignore": [
    "node_modules/**",
    "dist/**", 
    "build/**",
    "coverage/**",
    "*.min.js"
  ],
  "eslint": {
    "configFile": ".eslintrc.js",
    "extensions": [".js", ".jsx", ".ts", ".tsx"],
    "paths": ["src", "scripts"],
    "command": ["npm", "run", "lint:fix"],
    "appendPaths": true
  },
  "prettier": {
    "configFile": ".prettierrc.json", 
    "extensions": [".js", ".jsx", ".ts", ".tsx", ".json", ".css", ".scss", ".md"],
    "paths": ["src", "docs", "examples"],
    "command": ["npm", "run", "format"],
    "appendPaths": false
  },
  "markdownlint": {
    "configFile": ".markdownlint.yml",
    "paths": ["docs", "README.md", "CHANGELOG.md"],
    "command": ["npm", "run", "lint:markdown"],
    "appendPaths": true
  }
}
```

## Troubleshooting

### Common Issues

**Configuration not loading:**
- Check that `.felixrc.json` is valid JSON
- Verify the file is in the repository root
- Check the `config_path` action input if using a custom path

**Custom commands failing:**
- Ensure npm scripts exist in `package.json`
- Check that dependencies are installed (`npm ci` in workflow)
- Verify command arrays are properly formatted

**Paths not working:**
- Use forward slashes (`/`) in all paths
- Check that paths exist in the repository
- Remember that glob patterns need proper escaping in JSON

**Fixers not running:**
- Check that fixers are listed in the `fixers` array
- Verify fixer names are spelled correctly: `eslint`, `prettier`, `markdownlint`
- Ensure tools are installed or available via `npx`
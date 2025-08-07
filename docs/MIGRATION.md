# Migration Guide: Legacy to Inline Fixer Configuration

This guide helps you migrate from the legacy configuration format to the new, cleaner inline format introduced in Fix-it Felix v1.1.

## Overview

The new format eliminates the need to specify fixers twice by allowing configuration to be defined inline within the `fixers` array. This makes configurations more intuitive and easier to maintain.

## Migration Steps

### 1. Simple Configurations (No Custom Settings)

**Before (Legacy):**
```json
{
  "fixers": ["eslint", "prettier", "markdownlint"],
  "paths": ["src", "docs"]
}
```

**After (New Format):**
```json
{
  "fixers": ["eslint", "prettier", "markdownlint"],
  "paths": ["src", "docs"]
}
```

✅ **No changes needed** - simple configurations work unchanged!

### 2. Configurations with Custom Commands

**Before (Legacy):**
```json
{
  "fixers": ["eslint", "prettier"],
  "paths": ["src", "docs"],
  "eslint": {
    "command": ["yarn", "lint:js:base", "--fix"],
    "appendPaths": true,
    "env": {
      "NODE_OPTIONS": "--max-old-space-size=8192"
    }
  },
  "prettier": {
    "command": ["yarn", "prettier:write:path"],
    "appendPaths": true
  }
}
```

**After (New Format):**
```json
{
  "fixers": [
    {
      "name": "eslint",
      "command": ["yarn", "lint:js:base", "--fix"],
      "appendPaths": true,
      "env": {
        "NODE_OPTIONS": "--max-old-space-size=8192"
      }
    },
    {
      "name": "prettier",
      "command": ["yarn", "prettier:write:path"],
      "appendPaths": true
    }
  ],
  "paths": ["src", "docs"]
}
```

### 3. Mixed Configurations (Some Simple, Some Complex)

**Before (Legacy):**
```json
{
  "fixers": ["eslint", "prettier", "markdownlint"],
  "paths": ["src", "docs"],
  "eslint": {
    "extensions": [".js", ".jsx", ".ts", ".tsx"],
    "paths": ["src", "scripts"]
  },
  "prettier": {
    "command": ["npm", "run", "format"],
    "appendPaths": false
  }
}
```

**After (New Format):**
```json
{
  "fixers": [
    {
      "name": "eslint",
      "extensions": [".js", ".jsx", ".ts", ".tsx"],
      "paths": ["src", "scripts"]
    },
    {
      "name": "prettier",
      "command": ["npm", "run", "format"],
      "appendPaths": false
    },
    "markdownlint"
  ],
  "paths": ["src", "docs"]
}
```

## Quick Migration Reference

### For each fixer with custom configuration:

1. **Remove the fixer name from the `fixers` string array**
2. **Add a new object to the `fixers` array** with:
   - `"name": "fixer-name"` (required)
   - All the properties from the old fixer configuration block
3. **Delete the old fixer configuration block** (e.g., `"eslint": {...}`)
4. **Keep simple fixers as strings** in the `fixers` array

### Configuration Property Mapping

All properties map directly with one addition:

| Legacy Location | New Location | Notes |
|-----------------|--------------|-------|
| `"eslint": { ... }` | `{ "name": "eslint", ... }` | Add `name` property |
| `"prettier": { ... }` | `{ "name": "prettier", ... }` | Add `name` property |
| `"markdownlint": { ... }` | `{ "name": "markdownlint", ... }` | Add `name` property |

## Backward Compatibility

**Important:** The legacy format is still fully supported! You don't need to migrate immediately. Both formats work side-by-side:

```json
{
  "fixers": [
    "eslint",
    {
      "name": "prettier",
      "command": ["yarn", "format"]
    }
  ],
  "markdownlint": {
    "paths": ["docs"]
  }
}
```

This configuration mixes:
- Simple string fixer (`"eslint"`)
- Inline object fixer (`{ "name": "prettier", ... }`)
- Legacy fixer configuration (`"markdownlint": { ... }`)

## Benefits of Migration

✅ **Cleaner syntax** - No more specifying fixers twice  
✅ **Better organization** - All fixer config in one place  
✅ **Easier maintenance** - Add/remove fixers without touching multiple places  
✅ **More intuitive** - Configuration structure matches execution order  

## Example: Complete Migration

**Before:**
```json
{
  "fixers": ["oxlint", "eslint", "prettier"],
  "paths": ["static/ld/**/*", "packages/**/*"],
  "oxlint": {
    "command": ["yarn", "oxlint:js:path", "--fix"],
    "appendPaths": true
  },
  "eslint": {
    "command": ["yarn", "lint:js:base", "--fix"],
    "appendPaths": true,
    "env": {
      "NODE_OPTIONS": "--max-old-space-size=8192"
    }
  },
  "prettier": {
    "command": ["yarn", "prettier:write:path"],
    "appendPaths": true
  }
}
```

**After:**
```json
{
  "fixers": [
    {
      "name": "oxlint",
      "command": ["yarn", "oxlint:js:path", "--fix"],
      "appendPaths": true
    },
    {
      "name": "eslint",
      "command": ["yarn", "lint:js:base", "--fix"],
      "appendPaths": true,
      "env": {
        "NODE_OPTIONS": "--max-old-space-size=8192"
      }
    },
    {
      "name": "prettier",
      "command": ["yarn", "prettier:write:path"],
      "appendPaths": true
    }
  ],
  "paths": ["static/ld/**/*", "packages/**/*"]
}
```

Much cleaner! 🎉
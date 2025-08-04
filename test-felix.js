#!/usr/bin/env node

// Simple test script to simulate Felix running locally
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🛠️ Testing Fix-it Felix locally...\n')

// Set environment variables to simulate GitHub Actions
process.env.INPUT_FIXERS = 'prettier'
process.env.INPUT_COMMIT_MESSAGE = '🤖 Fix-it Felix: Auto-fixed code quality issues'
process.env.INPUT_CONFIG_PATH = '.felixrc.json'
process.env.INPUT_DRY_RUN = 'true'
process.env.INPUT_SKIP_LABEL = 'skip-felix'
process.env.INPUT_ALLOWED_BOTS = 'dependabot,renovate'
process.env.INPUT_PATHS = '' // Use config file paths

// Set GitHub context (minimal)
process.env.GITHUB_REPOSITORY = 'test/repo'
process.env.GITHUB_EVENT_NAME = 'pull_request'
process.env.GITHUB_SHA = 'abc123'

console.log('Environment variables set:')
console.log('- FIXERS:', process.env.INPUT_FIXERS)
console.log('- ALLOWED_BOTS:', process.env.INPUT_ALLOWED_BOTS)
console.log('- DRY_RUN:', process.env.INPUT_DRY_RUN)
console.log()

try {
  // Run the built action
  console.log('Running Fix-it Felix...')
  const result = execSync('node dist/index.js', {
    encoding: 'utf8',
    stdio: 'pipe'
  })

  console.log('✅ Felix completed successfully!')
  console.log('Output:', result)
} catch (error) {
  console.log('❌ Felix encountered an error:')
  console.log('Exit code:', error.status)
  console.log('stdout:', error.stdout)
  console.log('stderr:', error.stderr)
}

import * as core from '@actions/core'
import * as github from '@actions/github'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as path from 'path'
import { Context } from '@actions/github/lib/context'
import { ConfigManager } from './config'
import { createFixer, AVAILABLE_FIXERS } from './fixers'
import { FelixInputs, FelixResult } from './types'
import { minimatch } from 'minimatch'

export class FixitFelix {
  private inputs: FelixInputs
  private context: Context
  private config: ConfigManager
  private token: string

  constructor(inputs: FelixInputs, context: Context) {
    this.inputs = inputs
    this.context = context
    this.config = new ConfigManager(inputs)
    // Use PAT if provided, otherwise fallback to GITHUB_TOKEN
    this.token = core.getInput('personal_access_token') || process.env.GITHUB_TOKEN || ''
  }

  async run(): Promise<FelixResult> {
    const result: FelixResult = {
      fixesApplied: false,
      changedFiles: [],
      fixerResults: [],
      hasFailures: false
    }

    // Check if we should skip processing
    if (await this.shouldSkip()) {
      core.info('🚫 Skipping Fix-it Felix due to skip conditions')
      return result
    }

    // Check for infinite loop protection
    if (await this.isInfiniteLoopRisk()) {
      core.info('🔄 Skipping Fix-it Felix to prevent infinite loop')
      return result
    }

    // Get changed files from PR
    const changedFiles = await this.getChangedFilesInPR()
    if (changedFiles.length === 0) {
      core.info('📁 No files changed in PR')
      return result
    }

    core.info(`📁 Found ${changedFiles.length} changed files in PR`)

    // Run fixers
    const fixers = this.config.getFixers()
    core.info(`🛠️ Running fixers: ${fixers.join(', ')}`)

    for (const fixerName of fixers) {
      if (!AVAILABLE_FIXERS.includes(fixerName)) {
        const fixerConfig = this.config.getFixerConfig(fixerName)
        if (
          !fixerConfig.command ||
          !Array.isArray(fixerConfig.command) ||
          fixerConfig.command.length === 0
        ) {
          core.warning(`⚠️ Unknown fixer: ${fixerName}`)
          continue
        }
        core.info(`🔧 Using custom command for fixer: ${fixerName}`)
      }

      // Filter changed files for this fixer based on extensions and configured paths
      const fixerConfig = this.config.getFixerConfig(fixerName)
      const configuredPaths = this.config.getFixerPaths(fixerName)
      const relevantFiles = this.filterFilesByFixer(
        changedFiles,
        fixerName,
        fixerConfig,
        configuredPaths
      )

      if (relevantFiles.length === 0) {
        core.info(`📁 No relevant files for ${fixerName}`)
        continue
      }

      core.info(`📁 Running ${fixerName} on ${relevantFiles.length} changed files`)

      const fixer = createFixer(fixerName, fixerConfig, relevantFiles, this.config)
      if (!fixer) {
        core.warning(`⚠️ Could not create fixer: ${fixerName}`)
        continue
      }

      const fixerResult = await fixer.run()
      result.fixerResults.push(fixerResult)

      if (fixerResult.success && fixerResult.changedFiles.length > 0) {
        result.changedFiles.push(...fixerResult.changedFiles)
        result.fixesApplied = true
        core.info(`✅ ${fixerName} fixed ${fixerResult.changedFiles.length} files`)
      } else if (!fixerResult.success) {
        result.hasFailures = true
        core.error(`❌ ${fixerName} failed: ${fixerResult.error || 'Unknown error'}`)
      } else {
        core.info(`✨ ${fixerName} found no issues to fix`)
      }
    }

    // Remove duplicates from changed files
    result.changedFiles = [...new Set(result.changedFiles)]

    // Don't consider it a failure if we successfully applied any fixes
    // Even if some fixers had unfixable errors, overall success if any fixes were made
    if (result.fixesApplied) {
      result.hasFailures = false
    }

    // Commit changes if any and not in dry-run mode
    if (result.fixesApplied && !this.inputs.dryRun) {
      await this.commitChanges(result.changedFiles)
    } else if (result.fixesApplied && this.inputs.dryRun) {
      core.info('🔍 Dry-run mode: Changes detected but not committed')
      await this.commentOnPR(result)
    }

    return result
  }

  private async shouldSkip(): Promise<boolean> {
    // Skip if not a pull request
    if (this.context.eventName !== 'pull_request') {
      core.info('Not a pull request event')
      return true
    }

    // Skip if PR has skip label
    const pr = this.context.payload.pull_request
    if (pr?.labels?.some((label: any) => label.name === this.inputs.skipLabel)) {
      core.info(`PR has skip label: ${this.inputs.skipLabel}`)
      return true
    }

    // Skip if PR is from a fork (can't commit to fork PRs)
    if (pr?.head?.repo?.full_name !== pr?.base?.repo?.full_name) {
      core.info('PR is from a fork - cannot commit fixes')
      return true
    }

    return false
  }

  private async isInfiniteLoopRisk(): Promise<boolean> {
    try {
      // Check the last commit author
      let lastAuthor = ''
      await exec.exec('git', ['log', '-1', '--pretty=format:%an'], {
        listeners: {
          stdout: (data: Buffer) => {
            lastAuthor += data.toString()
          }
        }
      })

      // Get allowed bots from configuration
      const allowedBots = this.config.getAllowedBots()

      // Check if this author is in the allowed bots list
      const isAllowedBot = allowedBots.some(allowedBot =>
        lastAuthor.toLowerCase().includes(allowedBot.toLowerCase())
      )

      if (isAllowedBot) {
        core.info(`Last commit was by allowed bot: ${lastAuthor} - proceeding with fixes`)
        return false
      }

      // Check if the last commit was made by Felix or other specific bots
      const felixIndicators = ['fix-it-felix', 'felix', 'github-actions[bot]']
      const isLastCommitByFelix = felixIndicators.some(indicator =>
        lastAuthor.toLowerCase().includes(indicator)
      )

      // Also check for generic bot pattern, but only if not an allowed bot
      const isGenericBot = lastAuthor.toLowerCase().includes('[bot]')
      const isUnknownBot = isGenericBot && !isAllowedBot

      if (isLastCommitByFelix || isUnknownBot) {
        core.info(`Last commit was by: ${lastAuthor} - potential infinite loop`)
        return true
      }

      // Check commit message of last commit
      let lastCommitMessage = ''
      await exec.exec('git', ['log', '-1', '--pretty=format:%s'], {
        listeners: {
          stdout: (data: Buffer) => {
            lastCommitMessage += data.toString()
          }
        }
      })

      if (lastCommitMessage.includes('Fix-it Felix')) {
        core.info('Last commit message contains Felix signature - potential infinite loop')
        return true
      }

      return false
    } catch (error) {
      core.warning(`Could not check for infinite loop risk: ${error}`)
      return false
    }
  }

  private async commitChanges(changedFiles: string[]): Promise<void> {
    try {
      // Configure git authentication if using PAT
      await this.configureGitAuth()

      // Ensure we're on the correct branch
      await this.ensureCorrectBranch()

      // Stage the changed files
      await exec.exec('git', ['add', ...changedFiles])

      // Check if there are actually staged changes
      let statusOutput = ''
      await exec.exec('git', ['diff', '--cached', '--name-only'], {
        listeners: {
          stdout: (data: Buffer) => {
            statusOutput += data.toString()
          }
        }
      })

      if (!statusOutput.trim()) {
        core.info('No staged changes to commit')
        return
      }

      // Configure git user if not already configured
      await this.configureGitUser()

      if (this.inputs.debug) {
        core.info(`🔍 Debug: Creating commit with message: "${this.inputs.commitMessage}"`)
      }

      // Create commit
      await exec.exec('git', ['commit', '-m', this.inputs.commitMessage])

      if (this.inputs.debug) {
        core.info('🔍 Debug: Commit created successfully')

        // Show commit details for debugging
        let commitHash = ''
        await exec.exec('git', ['rev-parse', 'HEAD'], {
          listeners: {
            stdout: (data: Buffer) => {
              commitHash = data.toString().trim()
            }
          }
        })
        core.info(`🔍 Debug: Commit hash: ${commitHash}`)

        // Show what authentication method will be used for push
        const patToken = core.getInput('personal_access_token')
        if (patToken) {
          core.info('🔍 Debug: Push will use Personal Access Token authentication')
        } else {
          core.info('🔍 Debug: Push will use GITHUB_TOKEN authentication')
        }
      }

      // Push changes with explicit branch
      const pr = this.context.payload.pull_request
      const branchName = pr?.head?.ref
      if (branchName) {
        core.info(`🚀 Pushing changes to branch: ${branchName}`)

        if (this.inputs.debug) {
          core.info(`🔍 Debug: About to push to origin/${branchName}`)
        }

        try {
          await exec.exec('git', ['push', 'origin', `HEAD:${branchName}`])

          if (this.inputs.debug) {
            core.info('🔍 Debug: Push successful')
            core.info("🔍 Debug: Note: If workflows aren't triggering, check:")
            core.info('🔍 Debug:   - Token has "workflow" scope (for Classic PAT)')
            core.info('🔍 Debug:   - Token has "Actions: write" permission (for Fine-grained PAT)')
            core.info('🔍 Debug:   - Repository allows workflow triggers from pushes')
          }
        } catch (pushError) {
          core.warning(`Push failed, attempting to sync with remote and retry: ${pushError}`)

          if (this.inputs.debug) {
            core.info('🔍 Debug: Initial push failed, attempting rebase and retry')
          }

          try {
            // Use more reliable rebase approach
            await exec.exec('git', ['fetch', 'origin'])
            await exec.exec('git', ['rebase', `origin/${branchName}`])
            await exec.exec('git', ['push', 'origin', `HEAD:${branchName}`])
            core.info(`✅ Successfully pushed after rebase`)

            if (this.inputs.debug) {
              core.info('🔍 Debug: Retry push successful after rebase')
            }
          } catch (retryError) {
            core.error(`Failed to push even after rebase: ${retryError}`)

            if (this.inputs.debug) {
              core.info('🔍 Debug: Both initial push and retry failed')
              core.info('🔍 Debug: This may indicate authentication or permission issues')
            }

            throw new Error(`Could not push changes: ${retryError}`)
          }
        }
      } else {
        core.warning('Could not determine branch name, using fallback push')
        // Fallback to regular push if we can't determine branch name
        await exec.exec('git', ['push'])
      }

      core.info(`🚀 Committed and pushed fixes for ${changedFiles.length} files`)
    } catch (error) {
      throw new Error(`Failed to commit changes: ${error}`)
    }
  }

  private async configureGitAuth(): Promise<void> {
    const patToken = core.getInput('personal_access_token')

    if (patToken) {
      if (this.inputs.debug) {
        core.info('🔍 Debug: Personal Access Token provided')
        core.info(`🔍 Debug: PAT length: ${patToken.length} characters`)
        if (patToken.startsWith('ghp_')) {
          core.info('🔍 Debug: Token format: Classic Personal Access Token')
        } else if (patToken.startsWith('github_pat_')) {
          core.info('🔍 Debug: Token format: Fine-grained Personal Access Token')
        } else {
          core.info('🔍 Debug: Token format: Unknown format')
        }
      }

      try {
        // Configure git to use PAT for authentication
        const pr = this.context.payload.pull_request
        if (pr) {
          if (this.inputs.debug) {
            core.info(
              `🔍 Debug: Configuring PAT for repo: ${pr.base.repo.owner.login}/${pr.base.repo.name}`
            )
          }

          const remoteUrl = `https://x-access-token:${patToken}@github.com/${pr.base.repo.owner.login}/${pr.base.repo.name}.git`
          await exec.exec('git', ['remote', 'set-url', 'origin', remoteUrl])
          core.info('🔑 Configured git to use Personal Access Token')

          if (this.inputs.debug) {
            core.info('🔍 Debug: PAT authentication configured successfully')
          }
        } else {
          core.warning('⚠️ No pull request context available for PAT configuration')
        }
      } catch (error) {
        core.warning(`Could not configure git authentication: ${error}`)
        if (this.inputs.debug) {
          core.info('🔍 Debug: PAT authentication failed, will fall back to GITHUB_TOKEN')
        }
      }
    } else {
      if (this.inputs.debug) {
        const githubToken = this.token
        if (githubToken) {
          core.info('🔍 Debug: Using GITHUB_TOKEN for authentication')
          core.info(`🔍 Debug: GITHUB_TOKEN length: ${githubToken.length} characters`)

          if (githubToken.startsWith('ghs_')) {
            core.info('🔍 Debug: Token format: GitHub Actions token')
            core.info('🔍 Debug: ⚠️  Actions tokens have limited workflow triggering permissions')
          } else if (githubToken.startsWith('ghp_')) {
            core.info('🔍 Debug: Token format: Classic Personal Access Token')
          } else if (githubToken.startsWith('github_pat_')) {
            core.info('🔍 Debug: Token format: Fine-grained Personal Access Token')
          } else {
            core.info('🔍 Debug: Token format: Unknown format')
          }
        } else {
          core.info('🔍 Debug: No GITHUB_TOKEN available')
        }
      }
    }
  }

  private async configureGitUser(): Promise<void> {
    try {
      await exec.exec('git', ['config', 'user.name', 'Fix-it Felix[bot]'])
      await exec.exec('git', ['config', 'user.email', 'noreply@github.com'])
    } catch (error) {
      core.warning(`Could not configure git user: ${error}`)
    }
  }

  private async isDetachedHead(): Promise<boolean> {
    try {
      let output = ''
      await exec.exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString()
          }
        }
      })
      return output.trim() === 'HEAD'
    } catch (error) {
      core.warning(`Failed to determine HEAD state: ${error}`)
      return true // Assume detached if command fails
    }
  }

  private async ensureCorrectBranch(): Promise<void> {
    const pr = this.context.payload.pull_request
    const branchName = pr?.head?.ref

    if (!branchName) {
      throw new Error('Could not determine PR branch name')
    }

    if (await this.isDetachedHead()) {
      core.info(`🔧 Detected detached HEAD, checking out branch: ${branchName}`)

      // First, try to fetch the remote branch to check if it exists
      try {
        await exec.exec('git', ['fetch', 'origin', branchName])
        core.info(`📥 Fetched remote branch: ${branchName}`)

        // If fetch succeeds, checkout the branch (which will track remote automatically)
        await exec.exec('git', ['checkout', branchName])
        core.info(`✅ Successfully checked out remote branch: ${branchName}`)
      } catch (fetchError) {
        core.info(`Remote branch ${branchName} doesn't exist, creating locally`)

        try {
          // Remote branch doesn't exist, try to checkout local branch
          await exec.exec('git', ['checkout', branchName])
          core.info(`✅ Successfully checked out existing local branch: ${branchName}`)
        } catch (checkoutError) {
          try {
            // No local branch either, create new branch from current HEAD
            await exec.exec('git', ['checkout', '-b', branchName])
            core.info(`✅ Successfully created new branch: ${branchName}`)
          } catch (createError) {
            core.error(`Failed to create branch ${branchName}: ${createError}`)
            throw new Error(`Could not ensure correct branch: ${createError}`)
          }
        }
      }
    } else {
      core.debug(`Already on correct branch, not in detached HEAD state`)
    }
  }

  private async commentOnPR(result: FelixResult): Promise<void> {
    if (!this.token) {
      core.warning('No token available - cannot comment on PR')
      return
    }

    try {
      const octokit = github.getOctokit(this.token)
      const pr = this.context.payload.pull_request

      if (!pr) {
        core.warning('No pull request context available')
        return
      }

      const fixes = result.fixerResults
        .filter(r => r.success && r.changedFiles.length > 0)
        .map(r => `- **${r.name}**: ${r.changedFiles.length} files`)
        .join('\n')

      const comment = `## 🤖 Fix-it Felix - Dry Run Results

The following fixes would be applied:

${fixes}

**Files that would be changed:**
${result.changedFiles.map(f => `- \`${f}\``).join('\n')}

To apply these fixes, remove the \`dry_run: true\` option from your workflow.`

      await octokit.rest.issues.createComment({
        owner: this.context.repo.owner,
        repo: this.context.repo.repo,
        issue_number: pr.number,
        body: comment
      })

      core.info('📝 Posted dry-run results as PR comment')
    } catch (error) {
      core.warning(`Failed to comment on PR: ${error}`)
    }
  }

  private async getChangedFilesInPR(): Promise<string[]> {
    const pr = this.context.payload.pull_request
    if (!pr) {
      core.warning('No pull request context available')
      return []
    }

    // Try GitHub API first
    try {
      if (!this.token) {
        throw new Error('No token available')
      }

      const octokit = github.getOctokit(this.token)
      const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner: pr.base.repo.owner.login,
        repo: pr.base.repo.name,
        pull_number: pr.number
      })

      const changedFiles = files
        .map((f: any) => f.filename)
        .filter((file: string) => {
          // Skip deleted files
          try {
            return fs.existsSync(file)
          } catch {
            return false
          }
        })

      core.info(`📁 Found ${changedFiles.length} changed files via GitHub API`)
      return changedFiles
    } catch (apiError) {
      core.warning(`Could not get changed files from GitHub API: ${apiError}`)
    }

    // Fallback to git commands with multiple strategies
    const gitStrategies = [
      `origin/${pr.base.ref}...HEAD`,
      `${pr.base.sha}...HEAD`,
      `HEAD~1`,
      `HEAD^`
    ]

    for (const strategy of gitStrategies) {
      try {
        let output = ''
        await exec.exec('git', ['diff', '--name-only', strategy], {
          listeners: {
            stdout: (data: Buffer) => {
              output += data.toString()
            }
          }
        })

        const changedFiles = output
          .trim()
          .split('\n')
          .filter(file => file.length > 0)
          .filter(file => {
            // Skip deleted files
            try {
              return fs.existsSync(file)
            } catch {
              return false
            }
          })

        if (changedFiles.length > 0) {
          core.info(`📁 Found ${changedFiles.length} changed files via git strategy: ${strategy}`)
          return changedFiles
        }
      } catch (error) {
        core.debug(`Git strategy failed (${strategy}): ${error}`)
        continue
      }
    }

    core.warning('All git strategies failed, falling back to configured paths')
    // Final fallback to all configured paths
    return this.config.getPaths()
  }

  private filterFilesByFixer(
    files: string[],
    fixerName: string,
    fixerConfig: any,
    configuredPaths: string[]
  ): string[] {
    // Get the extensions this fixer handles
    let extensions: string[] = []

    switch (fixerName) {
      case 'eslint':
        extensions = fixerConfig.extensions || ['.js', '.jsx', '.ts', '.tsx', '.vue']
        break
      case 'oxlint':
        extensions = fixerConfig.extensions || [
          '.js',
          '.mjs',
          '.cjs',
          '.jsx',
          '.ts',
          '.mts',
          '.cts',
          '.tsx',
          '.vue',
          '.astro',
          '.svelte'
        ]
        break
      case 'prettier':
        extensions = fixerConfig.extensions || [
          '.js',
          '.jsx',
          '.ts',
          '.tsx',
          '.vue',
          '.json',
          '.md',
          '.yml',
          '.yaml',
          '.css',
          '.scss',
          '.less',
          '.html'
        ]
        break
      case 'markdownlint':
        extensions = fixerConfig.extensions || ['.md', '.markdown']
        break
      default:
        return files
    }

    if (this.inputs.debug) {
      core.info(`🔍 Debug: Filtering ${files.length} files for ${fixerName}`)
      core.info(`🔍 Debug: Extensions: ${extensions.join(', ')}`)
      core.info(`🔍 Debug: Configured paths: ${configuredPaths.join(', ')}`)
    }

    const filteredFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase()

      if (!extensions.includes(ext)) {
        if (this.inputs.debug) {
          core.info(`🔍 Debug: Excluded ${file}: extension ${ext} not in allowed extensions`)
        }
        return false
      }

      // Check if file is within configured paths
      // If configuredPaths is ['.'], include all files (default behavior)
      if (configuredPaths.length === 1 && configuredPaths[0] === '.') {
        if (this.inputs.debug) {
          core.info(`🔍 Debug: Included ${file}: matches default path '.'`)
        }
        return true
      }

      // Check if file matches any of the configured paths
      const pathMatches = configuredPaths.some(configPath => {
        const matches = minimatch(file, configPath)
        if (this.inputs.debug) {
          core.info(`🔍 Debug: Path check for ${file}: ${configPath} -> ${matches}`)
        }
        return matches
      })

      if (this.inputs.debug) {
        if (pathMatches) {
          core.info(`🔍 Debug: Included ${file}: matches configured paths`)
        } else {
          core.info(`🔍 Debug: Excluded ${file}: no path match`)
        }
      }

      return pathMatches
    })

    if (this.inputs.debug) {
      core.info(`🔍 Debug: Filtered result: ${filteredFiles.length} files`)
    }

    return filteredFiles
  }
}

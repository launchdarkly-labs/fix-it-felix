import * as core from '@actions/core'
import * as github from '@actions/github'
import * as exec from '@actions/exec'
import { Context } from '@actions/github/lib/context'
import { ConfigManager } from './config'
import { createFixer, AVAILABLE_FIXERS } from './fixers'
import { FelixInputs, FelixResult, FixerResult } from './types'

export class FixitFelix {
  private inputs: FelixInputs
  private context: Context
  private config: ConfigManager

  constructor(inputs: FelixInputs, context: Context) {
    this.inputs = inputs
    this.context = context
    this.config = new ConfigManager(inputs)
  }

  async run(): Promise<FelixResult> {
    const result: FelixResult = {
      fixesApplied: false,
      changedFiles: [],
      fixerResults: []
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

    // Run fixers
    const fixers = this.config.getFixers()
    core.info(`🛠️ Running fixers: ${fixers.join(', ')}`)

    for (const fixerName of fixers) {
      if (!AVAILABLE_FIXERS.includes(fixerName)) {
        core.warning(`⚠️ Unknown fixer: ${fixerName}`)
        continue
      }

      const fixerPaths = this.config.getFixerPaths(fixerName)
      const fixer = createFixer(
        fixerName,
        this.config.getFixerConfig(fixerName),
        fixerPaths,
        this.config
      )
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
        core.warning(`❌ ${fixerName} failed: ${fixerResult.error || 'Unknown error'}`)
      } else {
        core.info(`✨ ${fixerName} found no issues to fix`)
      }
    }

    // Remove duplicates from changed files
    result.changedFiles = [...new Set(result.changedFiles)]

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

      // Check if the last commit was made by Felix or other bots
      const felixIndicators = ['fix-it-felix', 'felix', 'github-actions', 'bot']
      const isLastCommitByFelix = felixIndicators.some(indicator =>
        lastAuthor.toLowerCase().includes(indicator)
      )

      if (isLastCommitByFelix) {
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

      // Create commit
      await exec.exec('git', ['commit', '-m', this.inputs.commitMessage])

      // Push changes
      await exec.exec('git', ['push'])

      core.info(`🚀 Committed and pushed fixes for ${changedFiles.length} files`)
    } catch (error) {
      throw new Error(`Failed to commit changes: ${error}`)
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

  private async commentOnPR(result: FelixResult): Promise<void> {
    if (!process.env.GITHUB_TOKEN) {
      core.warning('No GITHUB_TOKEN available - cannot comment on PR')
      return
    }

    try {
      const octokit = github.getOctokit(process.env.GITHUB_TOKEN)
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
}

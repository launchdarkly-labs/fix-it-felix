import * as core from '@actions/core'
import * as github from '@actions/github'
import { FixitFelix } from './felix'

async function run(): Promise<void> {
  try {
    const inputs = {
      fixers: core.getInput('fixers'),
      commitMessage: core.getInput('commit_message'),
      configPath: core.getInput('config_path'),
      dryRun: core.getBooleanInput('dry_run'),
      skipLabel: core.getInput('skip_label'),
      allowedBots: core.getInput('allowed_bots'),
      paths: core.getInput('paths'),
      personalAccessToken: core.getInput('personal_access_token')
    }

    const felix = new FixitFelix(inputs, github.context)
    const result = await felix.run()

    core.setOutput('fixes_applied', result.fixesApplied)
    core.setOutput('changed_files', result.changedFiles.join(','))

    if (result.hasFailures) {
      core.setFailed('One or more fixers failed')
    } else if (result.fixesApplied) {
      core.info(`✅ Fix-it Felix applied fixes to ${result.changedFiles.length} files`)
    } else {
      core.info('✨ No fixes needed - code is already clean!')
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}

run()

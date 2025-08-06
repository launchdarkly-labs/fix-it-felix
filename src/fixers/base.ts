import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { FixerResult } from '../types'

export abstract class BaseFixer {
  protected name: string
  protected config: any
  protected paths: string[]

  constructor(name: string, config: any = {}, paths: string[] = ['.']) {
    this.name = name
    this.config = config
    this.paths = paths
  }

  abstract isAvailable(): Promise<boolean>
  abstract getCommand(): string[]
  abstract getExtensions(): string[]

  async run(): Promise<FixerResult> {
    const result: FixerResult = {
      name: this.name,
      success: false,
      changedFiles: [],
      output: ''
    }

    try {
      if (!(await this.isAvailable())) {
        result.error = `${this.name} is not available`
        return result
      }

      const command = this.getCommand()
      core.info(`🔧 Running ${this.name}: ${command.join(' ')}`)

      let output = ''
      const options = {
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString()
          },
          stderr: (data: Buffer) => {
            output += data.toString()
          }
        },
        ignoreReturnCode: true
      }

      const exitCode = await exec.exec(command[0], command.slice(1), options)

      result.output = output
      result.success = exitCode === 0

      if (!result.success) {
        result.error = `${this.name} exited with code ${exitCode}`
        core.setFailed(`${this.name} failed with exit code ${exitCode}`)
      }

      result.changedFiles = await this.getChangedFiles()
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error)
    }

    return result
  }

  private async getChangedFiles(): Promise<string[]> {
    try {
      let output = ''
      await exec.exec('git', ['diff', '--name-only'], {
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString()
          }
        }
      })

      return output
        .trim()
        .split('\n')
        .filter(file => file.length > 0)
    } catch {
      return []
    }
  }
}

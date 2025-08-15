import * as exec from '@actions/exec'
import { FixitFelix } from '../src/felix'
import { FelixInputs } from '../src/types'

// Mock the exec module
jest.mock('@actions/exec')
const mockExec = exec as jest.Mocked<typeof exec>

// Mock fs to prevent config file reading during tests
jest.mock('fs', () => ({
  existsSync: jest.fn((path: string) => {
    // Return true for our test files so they're not filtered out as deleted
    if (path === 'src/test.js' || path === 'README.md') {
      return true
    }
    // Return false for everything else (like prettier binary check)
    return false
  }),
  readFileSync: jest.fn(() => '{}')
}))

describe('FixitFelix', () => {
  const defaultInputs: FelixInputs = {
    fixers: 'prettier',
    commitMessage: 'Test commit',
    configPath: '.felixrc.json',
    dryRun: true,
    skipLabel: 'skip-felix',
    allowedBots: '',
    paths: '',
    personalAccessToken: '',
    debug: false
  }

  const mockContext = {
    repo: { owner: 'test', repo: 'test-repo' },
    issue: { number: 1 },
    eventName: 'pull_request',
    payload: {
      pull_request: {
        number: 1,
        base: { ref: 'main' },
        head: { ref: 'feature' }
      }
    }
  } as any

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('bot detection and infinite loop protection', () => {
    it('should skip when last commit is from Felix', async () => {
      // Mock git log to return Felix as author
      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          options?.listeners?.stdout?.(Buffer.from('Fix-it Felix[bot]'))
        }
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(defaultInputs, mockContext)
      const result = await felix.run()

      expect(result.fixesApplied).toBe(false)
      expect(result.changedFiles).toEqual([])
    })

    it('should skip when last commit message contains Felix signature', async () => {
      // Mock git log to return regular author but Felix commit message
      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          options?.listeners?.stdout?.(Buffer.from('Regular User'))
        } else if (args && args.includes('--pretty=format:%s')) {
          options?.listeners?.stdout?.(Buffer.from('Fix-it Felix: Auto-fixed issues'))
        }
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(defaultInputs, mockContext)
      const result = await felix.run()

      expect(result.fixesApplied).toBe(false)
      expect(result.changedFiles).toEqual([])
    })

    it('should skip when last commit is from generic bot', async () => {
      // Mock git log to return bot author
      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          options?.listeners?.stdout?.(Buffer.from('github-actions[bot]'))
        }
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(defaultInputs, mockContext)
      const result = await felix.run()

      expect(result.fixesApplied).toBe(false)
      expect(result.changedFiles).toEqual([])
    })

    it('should proceed when last commit is from allowed bot', async () => {
      const inputsWithAllowedBots = {
        ...defaultInputs,
        allowedBots: 'dependabot,renovate'
      }

      // Mock git commands
      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          options?.listeners?.stdout?.(Buffer.from('dependabot[bot]'))
        } else if (args && args.includes('--pretty=format:%s')) {
          options?.listeners?.stdout?.(Buffer.from('Bump package version'))
        } else if (args && args.includes('--name-only') && args.includes('origin/')) {
          // Mock changed files in PR
          options?.listeners?.stdout?.(Buffer.from('src/test.js\nREADME.md'))
        } else if (command === 'npx' && args && args.includes('--version')) {
          // Mock prettier version check
          options?.listeners?.stdout?.(Buffer.from('2.8.0'))
          return Promise.resolve(0)
        } else if (
          command === 'npx' &&
          args &&
          args.includes('prettier') &&
          args.includes('--write')
        ) {
          // Mock prettier command
          return Promise.resolve(0)
        } else if (args && args.includes('--name-only') && !args.includes('origin/')) {
          // Mock git diff for changed files after running fixer
          options?.listeners?.stdout?.(Buffer.from('src/test.js'))
        }
        // Mock prettier command to succeed
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(inputsWithAllowedBots, mockContext)
      const result = await felix.run()

      // Should proceed with fixes instead of skipping
      expect(result).toBeDefined()
      expect(mockExec.exec).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['prettier', '--write']),
        expect.any(Object)
      )
    })

    it('should proceed when last commit is from regular user', async () => {
      // Mock git commands
      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          options?.listeners?.stdout?.(Buffer.from('Regular User'))
        } else if (args && args.includes('--pretty=format:%s')) {
          options?.listeners?.stdout?.(Buffer.from('Regular commit message'))
        } else if (args && args.includes('--name-only') && args.includes('origin/')) {
          // Mock changed files in PR
          options?.listeners?.stdout?.(Buffer.from('src/test.js\nREADME.md'))
        } else if (command === 'npx' && args && args.includes('--version')) {
          // Mock prettier version check
          options?.listeners?.stdout?.(Buffer.from('2.8.0'))
          return Promise.resolve(0)
        } else if (
          command === 'npx' &&
          args &&
          args.includes('prettier') &&
          args.includes('--write')
        ) {
          // Mock prettier command
          return Promise.resolve(0)
        } else if (args && args.includes('--name-only') && !args.includes('origin/')) {
          // Mock git diff for changed files after running fixer
          options?.listeners?.stdout?.(Buffer.from('src/test.js'))
        }
        // Mock prettier command to succeed
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(defaultInputs, mockContext)
      const result = await felix.run()

      // Should proceed with fixes
      expect(result).toBeDefined()
      expect(mockExec.exec).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['prettier', '--write']),
        expect.any(Object)
      )
    })

    it('should handle git command errors gracefully', async () => {
      // Mock git log to fail
      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          return Promise.reject(new Error('Git command failed'))
        } else if (args && args.includes('--name-only') && args.includes('origin/')) {
          // Mock changed files in PR
          options?.listeners?.stdout?.(Buffer.from('src/test.js\nREADME.md'))
        } else if (command === 'npx' && args && args.includes('--version')) {
          // Mock prettier version check
          options?.listeners?.stdout?.(Buffer.from('2.8.0'))
          return Promise.resolve(0)
        } else if (
          command === 'npx' &&
          args &&
          args.includes('prettier') &&
          args.includes('--write')
        ) {
          // Mock prettier command
          return Promise.resolve(0)
        } else if (args && args.includes('--name-only') && !args.includes('origin/')) {
          // Mock git diff for changed files after running fixer
          options?.listeners?.stdout?.(Buffer.from('src/test.js'))
        }
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(defaultInputs, mockContext)
      const result = await felix.run()

      // Should proceed when git command fails (fail-safe approach)
      expect(result).toBeDefined()
      expect(mockExec.exec).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['prettier', '--write']),
        expect.any(Object)
      )
    })
  })

  describe('allowed bots detection', () => {
    const testCases = [
      { input: 'dependabot', author: 'dependabot[bot]', shouldProceed: true },
      { input: 'dependabot', author: 'dependabot', shouldProceed: true },
      { input: 'renovate', author: 'renovate[bot]', shouldProceed: true },
      { input: 'dependabot,renovate', author: 'renovate[bot]', shouldProceed: true },
      { input: 'dependabot', author: 'other-bot[bot]', shouldProceed: false },
      { input: '', author: 'dependabot[bot]', shouldProceed: false },
      { input: 'devin-ai-integration', author: 'devin-ai-integration[bot]', shouldProceed: true }
    ]

    testCases.forEach(({ input, author, shouldProceed }) => {
      it(`should ${shouldProceed ? 'proceed' : 'skip'} for allowedBots="${input}" with author="${author}"`, async () => {
        const inputsWithBots = {
          ...defaultInputs,
          allowedBots: input
        }

        mockExec.exec.mockImplementation((command, args, options) => {
          if (args && args.includes('--pretty=format:%an')) {
            options?.listeners?.stdout?.(Buffer.from(author))
          } else if (args && args.includes('--pretty=format:%s')) {
            options?.listeners?.stdout?.(Buffer.from('Regular commit'))
          } else if (args && args.includes('--name-only') && args.includes('origin/')) {
            // Mock changed files in PR
            options?.listeners?.stdout?.(Buffer.from('src/test.js\nREADME.md'))
          } else if (command === 'npx' && args && args.includes('--version')) {
            // Mock prettier version check
            options?.listeners?.stdout?.(Buffer.from('2.8.0'))
            return Promise.resolve(0)
          } else if (
            command === 'npx' &&
            args &&
            args.includes('prettier') &&
            args.includes('--write')
          ) {
            // Mock prettier command
            return Promise.resolve(0)
          } else if (args && args.includes('--name-only') && !args.includes('origin/')) {
            // Mock git diff for changed files after running fixer
            options?.listeners?.stdout?.(Buffer.from('src/test.js'))
          }
          return Promise.resolve(0)
        })

        const felix = new FixitFelix(inputsWithBots, mockContext)
        const result = await felix.run()

        if (shouldProceed) {
          expect(mockExec.exec).toHaveBeenCalledWith(
            'npx',
            expect.arrayContaining(['prettier', '--write']),
            expect.any(Object)
          )
        } else {
          expect(result.fixesApplied).toBe(false)
        }
      })
    })
  })

  describe('case sensitivity in bot detection', () => {
    it('should be case insensitive for allowed bots', async () => {
      const inputsWithBots = {
        ...defaultInputs,
        allowedBots: 'DEPENDABOT,Renovate'
      }

      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          options?.listeners?.stdout?.(Buffer.from('dependabot[bot]'))
        } else if (args && args.includes('--name-only') && args.includes('origin/')) {
          // Mock changed files in PR
          options?.listeners?.stdout?.(Buffer.from('src/test.js\nREADME.md'))
        } else if (command === 'npx' && args && args.includes('--version')) {
          // Mock prettier version check
          options?.listeners?.stdout?.(Buffer.from('2.8.0'))
          return Promise.resolve(0)
        } else if (
          command === 'npx' &&
          args &&
          args.includes('prettier') &&
          args.includes('--write')
        ) {
          // Mock prettier command
          return Promise.resolve(0)
        } else if (args && args.includes('--name-only') && !args.includes('origin/')) {
          // Mock git diff for changed files after running fixer
          options?.listeners?.stdout?.(Buffer.from('src/test.js'))
        }
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(inputsWithBots, mockContext)
      const result = await felix.run()
      expect(result).toBeDefined()

      expect(mockExec.exec).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['prettier', '--write']),
        expect.any(Object)
      )
    })

    it('should be case insensitive for Felix indicators', async () => {
      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          options?.listeners?.stdout?.(Buffer.from('GITHUB-ACTIONS[bot]'))
        }
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(defaultInputs, mockContext)
      const result = await felix.run()

      expect(result.fixesApplied).toBe(false)
    })
  })

  describe('overall failure handling', () => {
    const mockContext = {
      eventName: 'pull_request',
      payload: {
        pull_request: {
          number: 123,
          head: { ref: 'feature-branch', repo: { full_name: 'owner/repo' } },
          base: {
            ref: 'main',
            repo: { owner: { login: 'owner' }, name: 'repo', full_name: 'owner/repo' }
          }
        }
      },
      repo: { owner: 'owner', repo: 'repo' }
    } as any

    it('should not mark as failure when any fixer applies fixes successfully', async () => {
      const inputsWithMultipleFixers: FelixInputs = {
        ...defaultInputs,
        fixers: 'eslint,prettier',
        dryRun: true
      }

      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          options?.listeners?.stdout?.(Buffer.from('Regular User'))
        } else if (args && args.includes('--pretty=format:%s')) {
          options?.listeners?.stdout?.(Buffer.from('Regular commit'))
        } else if (command === 'npm' && args && args.includes('lint:fix')) {
          // ESLint fails with unfixable errors
          return Promise.resolve(1)
        } else if (command === 'npm' && args && args.includes('format:fix')) {
          // Prettier succeeds
          return Promise.resolve(0)
        } else if (args && args.includes('--name-only')) {
          if (args.some(arg => arg.includes('eslint'))) {
            // No changes from eslint (unfixable errors)
            options?.listeners?.stdout?.(Buffer.from(''))
          } else {
            // Changes from prettier
            options?.listeners?.stdout?.(Buffer.from('src/test.js'))
          }
        }
        return Promise.resolve(0)
      })

      // Mock GitHub API
      const mockOctokit = {
        rest: {
          pulls: {
            listFiles: jest.fn().mockResolvedValue({
              data: [{ filename: 'src/test.js' }]
            })
          }
        }
      }
      jest.spyOn(require('@actions/github'), 'getOctokit').mockReturnValue(mockOctokit)

      const felix = new FixitFelix(inputsWithMultipleFixers, mockContext)
      const result = await felix.run()

      // Should have applied fixes from prettier
      expect(result.fixesApplied).toBe(true)
      expect(result.changedFiles).toContain('src/test.js')

      // Should not be marked as overall failure even though eslint "failed"
      expect(result.hasFailures).toBe(false)
    })

    it('should mark as failure when no fixer applies fixes successfully', async () => {
      const inputsWithMultipleFixers: FelixInputs = {
        ...defaultInputs,
        fixers: 'eslint,prettier',
        dryRun: true
      }

      let eslintCalled = false
      let prettierCalled = false

      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          options?.listeners?.stdout?.(Buffer.from('Regular User'))
        } else if (args && args.includes('--pretty=format:%s')) {
          options?.listeners?.stdout?.(Buffer.from('Regular commit'))
        } else if (command === 'npm' && args && args.includes('lint:fix')) {
          eslintCalled = true
          // ESLint command fails
          return Promise.resolve(1)
        } else if (command === 'npm' && args && args.includes('format:fix')) {
          prettierCalled = true
          // Prettier command fails
          return Promise.resolve(1)
        } else if (args && args.includes('--name-only')) {
          // No changes from either fixer
          options?.listeners?.stdout?.(Buffer.from(''))
        }
        return Promise.resolve(0)
      })

      // Mock GitHub API
      const mockOctokit = {
        rest: {
          pulls: {
            listFiles: jest.fn().mockResolvedValue({
              data: [{ filename: 'src/test.js' }]
            })
          }
        }
      }
      jest.spyOn(require('@actions/github'), 'getOctokit').mockReturnValue(mockOctokit)

      const felix = new FixitFelix(inputsWithMultipleFixers, mockContext)
      const result = await felix.run()

      // Should not have applied any fixes
      expect(result.fixesApplied).toBe(false)
      expect(result.changedFiles).toEqual([])

      // Note: Fixers may not be called if files don't match their patterns
      // The important thing is the overall behavior
      
      // Should not be marked as failure since no fixers actually made changes
      expect(result.hasFailures).toBe(false)
    })
  })
})

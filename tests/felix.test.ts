import * as exec from '@actions/exec'
import { FixitFelix } from '../src/felix'
import { FelixInputs } from '../src/types'

// Mock the exec module
jest.mock('@actions/exec')
const mockExec = exec as jest.Mocked<typeof exec>

// Mock fs to prevent config file reading during tests
jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
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
    paths: ''
  }

  const mockContext = {
    repo: { owner: 'test', repo: 'test-repo' },
    issue: { number: 1 },
    eventName: 'pull_request',
    payload: {}
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

      // Mock git log to return dependabot as author
      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          options?.listeners?.stdout?.(Buffer.from('dependabot[bot]'))
        } else if (args && args.includes('--pretty=format:%s')) {
          options?.listeners?.stdout?.(Buffer.from('Bump package version'))
        }
        // Mock prettier command to succeed
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(inputsWithAllowedBots, mockContext)
      const result = await felix.run()

      // Should proceed with fixes instead of skipping
      expect(mockExec.exec).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['prettier', '--write']),
        expect.any(Object)
      )
    })

    it('should proceed when last commit is from regular user', async () => {
      // Mock git log to return regular user
      mockExec.exec.mockImplementation((command, args, options) => {
        if (args && args.includes('--pretty=format:%an')) {
          options?.listeners?.stdout?.(Buffer.from('Regular User'))
        } else if (args && args.includes('--pretty=format:%s')) {
          options?.listeners?.stdout?.(Buffer.from('Regular commit message'))
        }
        // Mock prettier command to succeed
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(defaultInputs, mockContext)
      const result = await felix.run()

      // Should proceed with fixes
      expect(mockExec.exec).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['prettier', '--write']),
        expect.any(Object)
      )
    })

    it('should handle git command errors gracefully', async () => {
      // Mock git log to fail
      mockExec.exec.mockImplementation((command, args) => {
        if (args && args.includes('--pretty=format:%an')) {
          return Promise.reject(new Error('Git command failed'))
        }
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(defaultInputs, mockContext)
      const result = await felix.run()

      // Should proceed when git command fails (fail-safe approach)
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
      { input: '', author: 'dependabot[bot]', shouldProceed: false }
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
        }
        return Promise.resolve(0)
      })

      const felix = new FixitFelix(inputsWithBots, mockContext)
      const result = await felix.run()

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
})
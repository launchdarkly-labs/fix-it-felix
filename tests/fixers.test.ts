import { createFixer, AVAILABLE_FIXERS } from '../src/fixers'
import { ESLintFixer } from '../src/fixers/eslint'
import { PrettierFixer } from '../src/fixers/prettier'
import { MarkdownLintFixer } from '../src/fixers/markdownlint'
import { ConfigManager } from '../src/config'

describe('Fixer Factory', () => {
  describe('createFixer()', () => {
    it('should create ESLint fixer', () => {
      const fixer = createFixer('eslint')
      expect(fixer).toBeInstanceOf(ESLintFixer)
    })

    it('should create Prettier fixer', () => {
      const fixer = createFixer('prettier')
      expect(fixer).toBeInstanceOf(PrettierFixer)
    })

    it('should create MarkdownLint fixer', () => {
      const fixer = createFixer('markdownlint')
      expect(fixer).toBeInstanceOf(MarkdownLintFixer)
    })

    it('should be case insensitive', () => {
      expect(createFixer('ESLINT')).toBeInstanceOf(ESLintFixer)
      expect(createFixer('Prettier')).toBeInstanceOf(PrettierFixer)
      expect(createFixer('MarkdownLint')).toBeInstanceOf(MarkdownLintFixer)
    })

    it('should return null for unknown fixer', () => {
      expect(createFixer('unknown')).toBeNull()
    })

    it('should pass config and paths to fixer constructor', () => {
      const config = { configFile: '.custom' }
      const paths = ['src', 'docs']

      const fixer = createFixer('prettier', config, paths)
      expect(fixer).toBeInstanceOf(PrettierFixer)

      // Check that paths are passed correctly by examining the command
      const command = fixer!.getCommand()
      expect(command).toContain('src/**/*.{js,jsx,ts,tsx,json,css,scss,md,yml,yaml}')
      expect(command).toContain('docs/**/*.{js,jsx,ts,tsx,json,css,scss,md,yml,yaml}')
    })
  })

  describe('AVAILABLE_FIXERS', () => {
    it('should contain all supported fixers', () => {
      expect(AVAILABLE_FIXERS).toEqual(['eslint', 'prettier', 'markdownlint', 'oxlint'])
    })
  })
})

describe('PrettierFixer', () => {
  describe('getCommand()', () => {
    it('should generate correct command with default paths', () => {
      const fixer = new PrettierFixer()
      const command = fixer.getCommand()

      expect(command[0]).toBe('npx')
      expect(command[1]).toBe('prettier')
      expect(command).toContain('--write')
      expect(command).toContain('**/*.{js,jsx,ts,tsx,json,css,scss,md,yml,yaml}')
    })

    it('should include config file when specified', () => {
      const config = { configFile: '.prettierrc.custom' }
      const fixer = new PrettierFixer(config)
      const command = fixer.getCommand()

      expect(command).toContain('--config')
      expect(command).toContain('.prettierrc.custom')
    })

    it('should generate patterns for multiple paths', () => {
      const paths = ['src', 'docs']
      const fixer = new PrettierFixer({}, paths)
      const command = fixer.getCommand()

      expect(command).toContain('src/**/*.{js,jsx,ts,tsx,json,css,scss,md,yml,yaml}')
      expect(command).toContain('docs/**/*.{js,jsx,ts,tsx,json,css,scss,md,yml,yaml}')
    })

    it('should handle specific files and glob patterns', () => {
      const paths = ['README.md', '*.js', 'src']
      const fixer = new PrettierFixer({}, paths)
      const command = fixer.getCommand()

      expect(command).toContain('README.md')
      expect(command).toContain('*.js')
      expect(command).toContain('src/**/*.{js,jsx,ts,tsx,json,css,scss,md,yml,yaml}')
    })

    it('should use custom extensions when configured', () => {
      const config = { extensions: ['.js', '.css'] }
      const fixer = new PrettierFixer(config)
      const command = fixer.getCommand()

      expect(command).toContain('**/*.{js,css}')
    })

    it('should use custom command when configured', () => {
      const config = { command: ['npm', 'run', 'format'] }
      const fixer = new PrettierFixer(config)
      const command = fixer.getCommand()

      expect(command).toEqual(['npm', 'run', 'format'])
    })

    it('should append paths to custom command when paths are not default', () => {
      const config = { command: ['npm', 'run', 'format'] }
      const paths = ['src', 'docs']
      const fixer = new PrettierFixer(config, paths)
      const command = fixer.getCommand()

      expect(command).toEqual(['npm', 'run', 'format', 'src', 'docs'])
    })

    it('should not append paths when appendPaths is false', () => {
      const config = { command: ['npm', 'run', 'format'], appendPaths: false }
      const paths = ['src', 'docs']
      const fixer = new PrettierFixer(config, paths)
      const command = fixer.getCommand()

      expect(command).toEqual(['npm', 'run', 'format'])
    })
  })

  describe('getExtensions()', () => {
    it('should return default extensions', () => {
      const fixer = new PrettierFixer()
      const extensions = fixer.getExtensions()

      expect(extensions).toEqual([
        '.js',
        '.jsx',
        '.ts',
        '.tsx',
        '.json',
        '.css',
        '.scss',
        '.md',
        '.yml',
        '.yaml'
      ])
    })

    it('should return custom extensions when configured', () => {
      const config = { extensions: ['.js', '.css'] }
      const fixer = new PrettierFixer(config)
      const extensions = fixer.getExtensions()

      expect(extensions).toEqual(['.js', '.css'])
    })
  })
})

describe('ESLintFixer', () => {
  describe('getCommand()', () => {
    it('should generate correct command with default paths', () => {
      const fixer = new ESLintFixer()
      const command = fixer.getCommand()

      expect(command[0]).toBe('npx')
      expect(command[1]).toBe('eslint')
      expect(command).toContain('--fix')
      expect(command).toContain('.')
    })

    it('should include config file when specified', () => {
      const config = { configFile: '.eslintrc.custom.js' }
      const fixer = new ESLintFixer(config)
      const command = fixer.getCommand()

      expect(command).toContain('-c')
      expect(command).toContain('.eslintrc.custom.js')
    })

    it('should include extensions when specified', () => {
      const config = { extensions: ['.js', '.ts'] }
      const fixer = new ESLintFixer(config)
      const command = fixer.getCommand()

      expect(command).toContain('--ext')
      expect(command).toContain('.js,.ts')
    })

    it('should use specified paths', () => {
      const paths = ['src', 'scripts']
      const fixer = new ESLintFixer({}, paths)
      const command = fixer.getCommand()

      expect(command).toContain('src')
      expect(command).toContain('scripts')
    })

    it('should use custom command when configured', () => {
      const config = { command: ['npm', 'run', 'lint:fix'] }
      const fixer = new ESLintFixer(config)
      const command = fixer.getCommand()

      expect(command).toEqual(['npm', 'run', 'lint:fix'])
    })

    it('should not append paths when appendPaths is false', () => {
      const config = { command: ['npm', 'run', 'lint:fix'], appendPaths: false }
      const paths = ['src', 'lib']
      const fixer = new ESLintFixer(config, paths)
      const command = fixer.getCommand()

      expect(command).toEqual(['npm', 'run', 'lint:fix'])
    })
  })

  describe('getExtensions()', () => {
    it('should return default extensions', () => {
      const fixer = new ESLintFixer()
      const extensions = fixer.getExtensions()

      expect(extensions).toEqual(['.js', '.jsx', '.ts', '.tsx', '.vue'])
    })

    it('should return custom extensions when configured', () => {
      const config = { extensions: ['.js', '.ts'] }
      const fixer = new ESLintFixer(config)
      const extensions = fixer.getExtensions()

      expect(extensions).toEqual(['.js', '.ts'])
    })
  })
})

describe('MarkdownLintFixer', () => {
  describe('getCommand()', () => {
    it('should generate correct command with default paths', () => {
      const fixer = new MarkdownLintFixer()
      const command = fixer.getCommand()

      expect(command[0]).toBe('npx')
      expect(command[1]).toBe('markdownlint-cli2')
      expect(command).toContain('--fix')
      expect(command).toContain('**/*.md')
    })

    it('should include config file when specified', () => {
      const config = { configFile: '.markdownlint.custom.json' }
      const fixer = new MarkdownLintFixer(config)
      const command = fixer.getCommand()

      expect(command).toContain('--config')
      expect(command).toContain('.markdownlint.custom.json')
    })

    it('should generate patterns for multiple paths', () => {
      const paths = ['docs', 'guides']
      const fixer = new MarkdownLintFixer({}, paths)
      const command = fixer.getCommand()

      expect(command).toContain('docs/**/*.md')
      expect(command).toContain('guides/**/*.md')
    })

    it('should handle specific markdown files', () => {
      const paths = ['README.md', 'docs']
      const fixer = new MarkdownLintFixer({}, paths)
      const command = fixer.getCommand()

      expect(command).toContain('README.md')
      expect(command).toContain('docs/**/*.md')
    })

    it('should use custom command when configured', () => {
      const config = { command: ['npm', 'run', 'lint:markdown'] }
      const fixer = new MarkdownLintFixer(config)
      const command = fixer.getCommand()

      expect(command).toEqual(['npm', 'run', 'lint:markdown'])
    })

    it('should not append paths when appendPaths is false', () => {
      const config = { command: ['npm', 'run', 'lint:markdown'], appendPaths: false }
      const paths = ['docs', 'guides']
      const fixer = new MarkdownLintFixer(config, paths)
      const command = fixer.getCommand()

      expect(command).toEqual(['npm', 'run', 'lint:markdown'])
    })
  })

  describe('getExtensions()', () => {
    it('should return markdown extensions', () => {
      const fixer = new MarkdownLintFixer()
      const extensions = fixer.getExtensions()

      expect(extensions).toEqual(['.md', '.markdown'])
    })
  })

  describe('ignore patterns', () => {
    it('should filter out ignored paths when ConfigManager is provided', () => {
      // Mock inputs with test-files ignored
      const mockInputs = {
        fixers: 'prettier',
        paths: 'test-files',
        configPath: '.felixrc.json',
        dryRun: true,
        skipLabel: 'skip-felix',
        commitMessage: 'Fix formatting',
        allowedBots: 'dependabot',
        personalAccessToken: '',
        debug: false,
        skipDraftPrs: false
      }

      // Create a mock config manager that ignores test-files
      const configManager = new ConfigManager(mockInputs)
      jest.spyOn(configManager, 'getIgnorePatterns').mockReturnValue(['test-files/**'])

      const fixer = new PrettierFixer({}, ['test-files'], configManager)
      const command = fixer.getCommand()

      // Should include the no-processing pattern since test-files is ignored
      expect(command).toContain('non-existent-file-to-ensure-no-processing')
      expect(command).toContain('--no-error-on-unmatched-pattern')
    })

    it('should process paths normally when not ignored', () => {
      const mockInputs = {
        fixers: 'prettier',
        paths: 'src',
        configPath: '.felixrc.json',
        dryRun: true,
        skipLabel: 'skip-felix',
        commitMessage: 'Fix formatting',
        allowedBots: 'dependabot',
        personalAccessToken: '',
        debug: false,
        skipDraftPrs: false
      }

      const configManager = new ConfigManager(mockInputs)
      jest.spyOn(configManager, 'getIgnorePatterns').mockReturnValue(['test-files/**'])

      const fixer = new PrettierFixer({}, ['src'], configManager)
      const command = fixer.getCommand()

      // Should process src normally
      expect(command).toContain('src/**/*.{js,jsx,ts,tsx,json,css,scss,md,yml,yaml}')
      expect(command).not.toContain('non-existent-file-to-ensure-no-processing')
    })
  })
})

describe('BaseFixer Error Handling', () => {
  let mockExec: jest.SpyInstance

  beforeEach(() => {
    mockExec = jest.spyOn(require('@actions/exec'), 'exec')
  })

  afterEach(() => {
    mockExec.mockRestore()
  })

  it('should mark as successful when exit code is 0', async () => {
    mockExec.mockResolvedValueOnce(0) // Command succeeds
    mockExec.mockImplementation((command, args, options) => {
      if (command === 'git' && args[0] === 'diff') {
        // Mock git diff to show no changes
        options.listeners.stdout(Buffer.from(''))
        return Promise.resolve(0)
      }
      return Promise.resolve(0)
    })

    const fixer = new PrettierFixer({}, ['.'])
    jest.spyOn(fixer, 'isAvailable').mockResolvedValue(true)

    const result = await fixer.run()

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should mark as successful when exit code is non-zero but files were changed', async () => {
    mockExec.mockResolvedValueOnce(1) // Command exits with error
    mockExec.mockImplementation((command, args, options) => {
      if (command === 'git' && args[0] === 'diff') {
        // Mock git diff to show changes were made
        options.listeners.stdout(Buffer.from('src/test.ts\nother/file.js'))
        return Promise.resolve(0)
      }
      return Promise.resolve(1)
    })

    const fixer = new PrettierFixer({}, ['.'])
    jest.spyOn(fixer, 'isAvailable').mockResolvedValue(true)

    const result = await fixer.run()

    expect(result.success).toBe(true)
    expect(result.changedFiles).toEqual(['src/test.ts', 'other/file.js'])
  })

  it('should mark as successful when exit code is non-zero but tool ran (unfixable errors policy)', async () => {
    mockExec.mockResolvedValueOnce(1) // Command exits with error but ran
    mockExec.mockImplementation((command, args, options) => {
      if (command === 'git' && args[0] === 'diff') {
        // Mock git diff to show no changes
        options.listeners.stdout(Buffer.from(''))
        return Promise.resolve(0)
      }
      return Promise.resolve(1)
    })

    const fixer = new PrettierFixer({}, ['.'])
    jest.spyOn(fixer, 'isAvailable').mockResolvedValue(true)

    const result = await fixer.run()

    expect(result.success).toBe(true) // Now successful if tool ran, even with unfixable errors
    expect(result.changedFiles).toEqual([])
  })

  it('should mark as failed when command not found (exit code 127)', async () => {
    mockExec.mockResolvedValueOnce(127) // Command not found
    mockExec.mockImplementation((command, args, options) => {
      if (command === 'git' && args[0] === 'diff') {
        options.listeners.stdout(Buffer.from(''))
        return Promise.resolve(0)
      }
      return Promise.resolve(127)
    })

    const fixer = new PrettierFixer({}, ['.'])
    jest.spyOn(fixer, 'isAvailable').mockResolvedValue(true)

    const result = await fixer.run()

    expect(result.success).toBe(false)
    expect(result.error).toContain('exited with code 127')
  })

  it('should mark as failed when command not executable (exit code 126)', async () => {
    mockExec.mockResolvedValueOnce(126) // Command not executable
    mockExec.mockImplementation((command, args, options) => {
      if (command === 'git' && args[0] === 'diff') {
        options.listeners.stdout(Buffer.from(''))
        return Promise.resolve(0)
      }
      return Promise.resolve(126)
    })

    const fixer = new PrettierFixer({}, ['.'])
    jest.spyOn(fixer, 'isAvailable').mockResolvedValue(true)

    const result = await fixer.run()

    expect(result.success).toBe(false)
    expect(result.error).toContain('exited with code 126')
  })
})

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
        allowedBots: 'dependabot'
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
        allowedBots: 'dependabot'
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

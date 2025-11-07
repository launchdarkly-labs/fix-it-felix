import * as fs from 'fs'
import { ConfigManager } from '../src/config'
import { FelixInputs } from '../src/types'

// Mock fs module
jest.mock('fs')
const mockFs = fs as jest.Mocked<typeof fs>

describe('ConfigManager', () => {
  const defaultInputs: FelixInputs = {
    fixers: 'eslint,prettier',
    commitMessage: 'Test commit',
    configPath: '.felixrc.json',
    dryRun: false,
    skipLabel: 'skip-felix',
    allowedBots: '',
    paths: '',
    personalAccessToken: '',
    debug: false,
    skipDraftPrs: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor and config loading', () => {
    it('should load config from file when it exists', () => {
      const configContent = {
        fixers: ['prettier', 'markdownlint'],
        paths: ['src', 'docs'],
        ignore: ['node_modules/**']
      }

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configContent))

      const manager = new ConfigManager(defaultInputs)

      expect(manager).toBeDefined()
      expect(mockFs.existsSync).toHaveBeenCalledWith('.felixrc.json')
      expect(mockFs.readFileSync).toHaveBeenCalledWith('.felixrc.json', 'utf8')
    })

    it('should use defaults when config file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(defaultInputs)

      expect(manager).toBeDefined()
      expect(mockFs.existsSync).toHaveBeenCalledWith('.felixrc.json')
      expect(mockFs.readFileSync).not.toHaveBeenCalled()
    })

    it('should handle JSON parse errors gracefully', () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue('invalid json')

      const manager = new ConfigManager(defaultInputs)

      // Should not throw and should fall back to defaults
      expect(manager.getFixers()).toEqual(['eslint', 'prettier'])
    })
  })

  describe('getFixers()', () => {
    it('should return fixers from config file when available', () => {
      const configContent = {
        fixers: ['prettier', 'markdownlint']
      }

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configContent))

      const manager = new ConfigManager(defaultInputs)
      expect(manager.getFixers()).toEqual(['prettier', 'markdownlint'])
    })

    it('should return fixers from input when config file has no fixers', () => {
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}))

      const manager = new ConfigManager(defaultInputs)
      expect(manager.getFixers()).toEqual(['eslint', 'prettier'])
    })

    it('should handle comma-separated input fixers', () => {
      const inputs = { ...defaultInputs, fixers: 'eslint, prettier , markdownlint' }
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(inputs)
      expect(manager.getFixers()).toEqual(['eslint', 'prettier', 'markdownlint'])
    })

    it('should filter out empty fixer names', () => {
      const inputs = { ...defaultInputs, fixers: 'eslint,,prettier,' }
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(inputs)
      expect(manager.getFixers()).toEqual(['eslint', 'prettier'])
    })
  })

  describe('getPaths()', () => {
    it('should return paths from config file when available', () => {
      const configContent = {
        paths: ['src', 'docs']
      }

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configContent))

      const manager = new ConfigManager(defaultInputs)
      expect(manager.getPaths()).toEqual(['src', 'docs'])
    })

    it('should return paths from input when config file has no paths', () => {
      const inputs = { ...defaultInputs, paths: 'src,docs,scripts' }
      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify({}))

      const manager = new ConfigManager(inputs)
      expect(manager.getPaths()).toEqual(['src', 'docs', 'scripts'])
    })

    it('should return default path when no paths configured', () => {
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(defaultInputs)
      expect(manager.getPaths()).toEqual(['.'])
    })

    it('should handle comma-separated input paths with whitespace', () => {
      const inputs = { ...defaultInputs, paths: 'src, docs , scripts ' }
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(inputs)
      expect(manager.getPaths()).toEqual(['src', 'docs', 'scripts'])
    })

    it('should filter out empty path names', () => {
      const inputs = { ...defaultInputs, paths: 'src,,docs,' }
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(inputs)
      expect(manager.getPaths()).toEqual(['src', 'docs'])
    })

    it('should prioritize action input paths over config file paths', () => {
      const inputs = { ...defaultInputs, paths: 'test-files,custom-dir' }
      const configContent = {
        paths: ['src', 'docs', 'config-paths']
      }

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configContent))

      const manager = new ConfigManager(inputs)
      // Action input should override config file
      expect(manager.getPaths()).toEqual(['test-files', 'custom-dir'])
    })
  })

  describe('getFixerPaths()', () => {
    it('should return fixer-specific paths when configured', () => {
      const configContent = {
        paths: ['src', 'docs'],
        prettier: {
          paths: ['src', 'examples']
        }
      }

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configContent))

      const manager = new ConfigManager(defaultInputs)
      expect(manager.getFixerPaths('prettier')).toEqual(['src', 'examples'])
      expect(manager.getFixerPaths('eslint')).toEqual(['src', 'docs']) // fallback to global
    })

    it('should fallback to global paths when fixer has no specific paths', () => {
      const configContent = {
        paths: ['src', 'docs']
      }

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configContent))

      const manager = new ConfigManager(defaultInputs)
      expect(manager.getFixerPaths('eslint')).toEqual(['src', 'docs'])
    })
  })

  describe('getAllowedBots()', () => {
    it('should return allowed bots from input', () => {
      const inputs = { ...defaultInputs, allowedBots: 'dependabot,renovate,github-actions' }
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(inputs)
      expect(manager.getAllowedBots()).toEqual(['dependabot', 'renovate', 'github-actions'])
    })

    it('should handle whitespace in allowed bots', () => {
      const inputs = { ...defaultInputs, allowedBots: ' dependabot , renovate , github-actions ' }
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(inputs)
      expect(manager.getAllowedBots()).toEqual(['dependabot', 'renovate', 'github-actions'])
    })

    it('should return empty array when no allowed bots configured', () => {
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(defaultInputs)
      expect(manager.getAllowedBots()).toEqual([])
    })

    it('should filter out empty bot names', () => {
      const inputs = { ...defaultInputs, allowedBots: 'dependabot,,renovate,' }
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(inputs)
      expect(manager.getAllowedBots()).toEqual(['dependabot', 'renovate'])
    })
  })

  describe('getIgnorePatterns()', () => {
    it('should return ignore patterns from config file', () => {
      const configContent = {
        ignore: ['node_modules/**', 'custom/**']
      }

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configContent))

      const manager = new ConfigManager(defaultInputs)
      expect(manager.getIgnorePatterns()).toEqual(['node_modules/**', 'custom/**'])
    })

    it('should return default ignore patterns when not configured', () => {
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(defaultInputs)
      expect(manager.getIgnorePatterns()).toEqual([
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**'
      ])
    })
  })

  describe('getFixerConfig()', () => {
    it('should return fixer-specific configuration', () => {
      const configContent = {
        prettier: {
          configFile: '.prettierrc.custom',
          extensions: ['.js', '.ts']
        }
      }

      mockFs.existsSync.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configContent))

      const manager = new ConfigManager(defaultInputs)
      expect(manager.getFixerConfig('prettier')).toEqual({
        configFile: '.prettierrc.custom',
        extensions: ['.js', '.ts']
      })
    })

    it('should return empty object for unknown fixer', () => {
      mockFs.existsSync.mockReturnValue(false)

      const manager = new ConfigManager(defaultInputs)
      expect(manager.getFixerConfig('unknown')).toEqual({})
    })
  })
})

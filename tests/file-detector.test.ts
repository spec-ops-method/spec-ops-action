import { parsePatterns } from '../src/file-detector';

describe('file-detector', () => {
  describe('parsePatterns', () => {
    it('should return single pattern when provided', () => {
      const result = parsePatterns('**/*.md', undefined);
      expect(result).toEqual(['**/*.md']);
    });

    it('should return multi-line patterns when provided', () => {
      const multiPattern = `specs/**/*.md
docs/specs/**/*.md
**/*-spec.md`;
      const result = parsePatterns(undefined, multiPattern);
      expect(result).toEqual([
        'specs/**/*.md',
        'docs/specs/**/*.md',
        '**/*-spec.md',
      ]);
    });

    it('should prefer multi-line patterns over single pattern', () => {
      const multiPattern = `specs/**/*.md
docs/**/*.md`;
      const result = parsePatterns('single/*.md', multiPattern);
      expect(result).toEqual(['specs/**/*.md', 'docs/**/*.md']);
    });

    it('should return empty array when no patterns provided', () => {
      const result = parsePatterns(undefined, undefined);
      expect(result).toEqual([]);
    });

    it('should filter out empty lines from multi-line patterns', () => {
      const multiPattern = `specs/**/*.md

docs/**/*.md
   
**/*-spec.md`;
      const result = parsePatterns(undefined, multiPattern);
      expect(result).toEqual([
        'specs/**/*.md',
        'docs/**/*.md',
        '**/*-spec.md',
      ]);
    });

    it('should trim whitespace from patterns', () => {
      const multiPattern = `  specs/**/*.md  
  docs/**/*.md  `;
      const result = parsePatterns(undefined, multiPattern);
      expect(result).toEqual(['specs/**/*.md', 'docs/**/*.md']);
    });
  });
});

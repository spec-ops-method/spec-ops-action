import { formatDiffAsCodeBlock } from '../src/diff-generator';

describe('diff-generator', () => {
  describe('formatDiffAsCodeBlock', () => {
    it('should wrap diff in code block with diff syntax', () => {
      const diff = `--- a/file.md
+++ b/file.md
@@ -1,3 +1,3 @@
 line 1
-old line 2
+new line 2
 line 3`;
      
      const result = formatDiffAsCodeBlock(diff);
      
      expect(result).toBe('```diff\n' + diff + '\n```');
    });

    it('should handle empty diff', () => {
      const result = formatDiffAsCodeBlock('');
      expect(result).toBe('```\nNo changes detected.\n```');
    });

    it('should handle whitespace-only diff', () => {
      const result = formatDiffAsCodeBlock('   \n  \n');
      expect(result).toBe('```\nNo changes detected.\n```');
    });

    it('should preserve diff content exactly', () => {
      const diff = '+added line\n-removed line\n unchanged';
      const result = formatDiffAsCodeBlock(diff);
      expect(result).toContain('+added line');
      expect(result).toContain('-removed line');
      expect(result).toContain(' unchanged');
    });
  });
});

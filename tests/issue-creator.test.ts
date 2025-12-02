import { parseCommaSeparatedList } from '../src/issue-creator';

describe('issue-creator', () => {
  describe('parseCommaSeparatedList', () => {
    it('should parse comma-separated values', () => {
      const result = parseCommaSeparatedList('label1, label2, label3');
      expect(result).toEqual(['label1', 'label2', 'label3']);
    });

    it('should trim whitespace', () => {
      const result = parseCommaSeparatedList('  user1  ,  user2  ,  user3  ');
      expect(result).toEqual(['user1', 'user2', 'user3']);
    });

    it('should handle single value', () => {
      const result = parseCommaSeparatedList('single-label');
      expect(result).toEqual(['single-label']);
    });

    it('should return empty array for empty string', () => {
      const result = parseCommaSeparatedList('');
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      const result = parseCommaSeparatedList(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      const result = parseCommaSeparatedList('   ');
      expect(result).toEqual([]);
    });

    it('should filter out empty values from list', () => {
      const result = parseCommaSeparatedList('label1, , label2,  , label3');
      expect(result).toEqual(['label1', 'label2', 'label3']);
    });

    it('should handle values without spaces', () => {
      const result = parseCommaSeparatedList('a,b,c');
      expect(result).toEqual(['a', 'b', 'c']);
    });
  });
});

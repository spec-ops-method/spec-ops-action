import { renderIssue, getDefaultTemplate, RenderOptions, TemplateContext } from '../src/template-renderer';
import { FileDiff } from '../src/diff-generator';
import { ChangedFile } from '../src/file-detector';

describe('template-renderer', () => {
  const mockChangedFile: ChangedFile = {
    path: 'docs/api-specification.md',
    changeType: 'modified',
  };

  const mockFileDiff: FileDiff = {
    file: mockChangedFile,
    diff: '+added line\n-removed line',
    truncated: false,
    lineCount: 2,
  };

  const defaultRenderOptions: RenderOptions = {
    titleTemplate: 'Specification Change: {{ filename }}',
    bodyTemplate: '',
    includeDiff: true,
    includeFileLink: true,
    includeCommitLink: true,
    includePrLink: true,
    sanitizeDiff: true,
  };

  const mockContext: Partial<TemplateContext> = {
    commit_sha: 'abc1234567890',
    commit_sha_short: 'abc1234',
    commit_message: 'Update API spec',
    commit_date: '2025-12-01',
    author: 'testuser',
    branch: 'main',
  };

  beforeEach(() => {
    // Set up environment variables
    process.env.GITHUB_SERVER_URL = 'https://github.com';
    process.env.GITHUB_REPOSITORY = 'test-org/test-repo';
    process.env.GITHUB_SHA = 'abc1234567890';
  });

  afterEach(() => {
    delete process.env.GITHUB_SERVER_URL;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_SHA;
  });

  describe('renderIssue', () => {
    it('should render title with filename', () => {
      const result = renderIssue(mockFileDiff, defaultRenderOptions, mockContext);
      expect(result.title).toBe('Specification Change: api-specification.md');
    });

    it('should render custom title template', () => {
      const options = {
        ...defaultRenderOptions,
        titleTemplate: '[SPEC] {{ filename }} - {{ change_type }}',
      };
      const result = renderIssue(mockFileDiff, options, mockContext);
      expect(result.title).toBe('[SPEC] api-specification.md - modified');
    });

    it('should include file path in body', () => {
      const result = renderIssue(mockFileDiff, defaultRenderOptions, mockContext);
      expect(result.body).toContain('docs/api-specification.md');
    });

    it('should include diff when includeDiff is true', () => {
      const result = renderIssue(mockFileDiff, defaultRenderOptions, mockContext);
      expect(result.body).toContain('```diff');
      expect(result.body).toContain('+added line');
      expect(result.body).toContain('-removed line');
    });

    it('should not include diff when includeDiff is false', () => {
      const options = { ...defaultRenderOptions, includeDiff: false };
      const result = renderIssue(mockFileDiff, options, mockContext);
      expect(result.body).not.toContain('+added line');
    });

    it('should include commit link', () => {
      const result = renderIssue(mockFileDiff, defaultRenderOptions, mockContext);
      expect(result.body).toContain('https://github.com/test-org/test-repo/commit/abc1234567890');
    });

    it('should include author with @ mention', () => {
      const result = renderIssue(mockFileDiff, defaultRenderOptions, mockContext);
      expect(result.body).toContain('@testuser');
    });

    it('should include PR link when PR context is provided', () => {
      const contextWithPR: Partial<TemplateContext> = {
        ...mockContext,
        pr_number: '42',
        pr_title: 'Update specifications',
      };
      const result = renderIssue(mockFileDiff, defaultRenderOptions, contextWithPR);
      expect(result.body).toContain('https://github.com/test-org/test-repo/pull/42');
    });

    it('should handle renamed files', () => {
      const renamedFile: ChangedFile = {
        path: 'docs/new-name-specification.md',
        changeType: 'renamed',
        previousPath: 'docs/old-name-specification.md',
      };
      const renamedDiff: FileDiff = {
        file: renamedFile,
        diff: 'rename diff',
        truncated: false,
        lineCount: 1,
      };
      
      const options = {
        ...defaultRenderOptions,
        titleTemplate: '{{ change_type }}: {{ filename }} (was {{ previous_path }})',
      };
      const result = renderIssue(renamedDiff, options, mockContext);
      expect(result.title).toContain('renamed');
      expect(result.title).toContain('docs/old-name-specification.md');
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return non-empty template', () => {
      const template = getDefaultTemplate();
      expect(template).toBeTruthy();
      expect(template.length).toBeGreaterThan(100);
    });

    it('should contain required placeholders', () => {
      const template = getDefaultTemplate();
      expect(template).toContain('{{ file_path }}');
      expect(template).toContain('{{ commit_sha_short }}');
      expect(template).toContain('{{ author }}');
      expect(template).toContain('{{{ diff }}}');
    });

    it('should contain checklist items', () => {
      const template = getDefaultTemplate();
      expect(template).toContain('- [ ] Reviewed specification change');
      expect(template).toContain('- [ ] Determined if code changes are required');
    });
  });
});

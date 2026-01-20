import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeChunk } from './schemas/knowledge-chunk.schema';

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  const mockKnowledgeChunkModel = {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    distinct: jest.fn(),
    deleteMany: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockReturnValue('sk-test-api-key');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        {
          provide: getModelToken(KnowledgeChunk.name),
          useValue: mockKnowledgeChunkModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 2, 3];
      expect(service.cosineSimilarity(vec, vec)).toBeCloseTo(1);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vecA = [1, 0];
      const vecB = [0, 1];
      expect(service.cosineSimilarity(vecA, vecB)).toBeCloseTo(0);
    });

    it('should throw error for vectors of different length', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2];
      expect(() => service.cosineSimilarity(vecA, vecB)).toThrow();
    });
  });

  describe('splitIntoChunks', () => {
    it('should split text into chunks', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = service.splitIntoChunks(text, 30);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('should not split short text', () => {
      const text = 'Short text.';
      const chunks = service.splitIntoChunks(text, 1000);
      expect(chunks.length).toBe(1);
    });
  });

  /**
   * TODO: El candidato debe implementar estos tests
   */
  describe('createEmbedding', () => {
    it('should create embeddings using OpenAI API', async () => {
      mockConfigService.get.mockReturnValue('sk-test-key');

      const mockOpenAI = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: [0.1, 0.2, 0.3] }],
          }),
        },
      };

      (service as any).openai = mockOpenAI;

      const result = await service.createEmbedding('test text');

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text',
      });
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it('should throw error when text is empty', async () => {
      mockConfigService.get.mockReturnValue('sk-test-key');

      await expect(service.createEmbedding('')).rejects.toThrow();
      await expect(service.createEmbedding('   ')).rejects.toThrow();
    });
  });

  describe('indexCourseContent', () => {
    it('should index course content into chunks', async () => {
      mockConfigService.get.mockReturnValue('sk-test-key');

      const courseId = '507f1f77bcf86cd799439011';
      const content = 'First sentence. Second sentence. Third sentence.';
      const sourceFile = 'test.pdf';

      mockKnowledgeChunkModel.deleteMany.mockResolvedValue({ deletedCount: 0 });

      const mockOpenAI = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: [0.1, 0.2, 0.3] }],
          }),
        },
      };
      (service as any).openai = mockOpenAI;

      mockKnowledgeChunkModel.create.mockResolvedValue({});

      const result = await service.indexCourseContent(
        courseId,
        content,
        sourceFile,
      );

      expect(mockKnowledgeChunkModel.deleteMany).toHaveBeenCalledWith({
        courseId: expect.any(Object),
        sourceFile,
      });

      expect(mockKnowledgeChunkModel.create).toHaveBeenCalled();
      expect(result.chunksCreated).toBeGreaterThan(0);
    });

    it('should delete existing chunks before indexing', async () => {
      mockConfigService.get.mockReturnValue('sk-test-key');

      const courseId = '507f1f77bcf86cd799439011';
      const content = 'Test content.';
      const sourceFile = 'test.pdf';

      mockKnowledgeChunkModel.deleteMany.mockResolvedValue({ deletedCount: 5 });

      const mockOpenAI = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: [0.1, 0.2] }],
          }),
        },
      };
      (service as any).openai = mockOpenAI;

      mockKnowledgeChunkModel.create.mockResolvedValue({});

      await service.indexCourseContent(courseId, content, sourceFile);

      expect(mockKnowledgeChunkModel.deleteMany).toHaveBeenCalledWith({
        courseId: expect.any(Object),
        sourceFile: 'test.pdf',
      });
    });

    it('should throw HttpException for invalid courseId', async () => {
      mockConfigService.get.mockReturnValue('sk-test-key');

      await expect(
        service.indexCourseContent('invalid-id', 'content', 'file.pdf'),
      ).rejects.toThrow(HttpException);

      await expect(
        service.indexCourseContent('invalid-id', 'content', 'file.pdf'),
      ).rejects.toThrow('Invalid courseId');

      expect(mockKnowledgeChunkModel.create).not.toHaveBeenCalled();
    });

    it('should throw HttpException for empty courseId', async () => {
      mockConfigService.get.mockReturnValue('sk-test-key');

      await expect(
        service.indexCourseContent('', 'content', 'file.pdf'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('searchSimilar', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('sk-test-key');

      const mockOpenAI = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: [1, 0, 0] }],
          }),
        },
      };
      (service as any).openai = mockOpenAI;
    });

    it('should search for similar content', async () => {
      const mockChunks = [
        {
          content: 'JavaScript basics',
          courseId: '507f1f77bcf86cd799439011',
          embedding: [1, 0, 0],
          metadata: {},
        },
        {
          content: 'React hooks',
          courseId: '507f1f77bcf86cd799439012',
          embedding: [0, 1, 0],
          metadata: {},
        },
      ];

      mockKnowledgeChunkModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockChunks),
      });

      const results = await service.searchSimilar('javascript', {
        limit: 5,
        minScore: 0.5,
      });

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('JavaScript basics');
      expect(results[0].score).toBeCloseTo(1, 2);
    });

    it('should filter search results by courseId', async () => {
      const targetCourseId = '507f1f77bcf86cd799439011';

      const mockChunks = [
        {
          content: 'Content from course 1',
          courseId: { toString: () => targetCourseId },
          embedding: [0.9, 0.1, 0],
          metadata: {},
        },
      ];

      mockKnowledgeChunkModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockChunks),
      });

      await service.searchSimilar('query', { courseId: targetCourseId });

      expect(mockKnowledgeChunkModel.find).toHaveBeenCalledWith({
        courseId: expect.any(Object),
      });
    });

    it('should return results sorted by similarity score', async () => {
      const mockChunks = [
        {
          content: 'Low similarity',
          courseId: '1',
          embedding: [0.5, 0.5, 0],
          metadata: {},
        },
        {
          content: 'High similarity',
          courseId: '2',
          embedding: [1, 0, 0],
          metadata: {},
        },
        {
          content: 'Medium similarity',
          courseId: '3',
          embedding: [0.8, 0.2, 0],
          metadata: {},
        },
      ];

      mockKnowledgeChunkModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockChunks),
      });

      const results = await service.searchSimilar('query', {
        limit: 10,
        minScore: 0,
      });

      expect(results).toHaveLength(3);
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      expect(results[1].score).toBeGreaterThanOrEqual(results[2].score);
      expect(results[0].content).toBe('High similarity');
    });

    it('should respect minScore threshold', async () => {
      const mockChunks = [
        {
          content: 'High score',
          courseId: '1',
          embedding: [1, 0, 0],
          metadata: {},
        },
        {
          content: 'Low score',
          courseId: '2',
          embedding: [0.3, 0.7, 0],
          metadata: {},
        },
      ];

      mockKnowledgeChunkModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockChunks),
      });

      const results = await service.searchSimilar('query', { minScore: 0.5 });

      expect(results.length).toBeLessThan(mockChunks.length);
      expect(results.every((r) => r.score >= 0.5)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const mockChunks = Array.from({ length: 10 }, (_, i) => ({
        content: `Chunk ${i}`,
        courseId: 'test',
        embedding: [0.9, 0.1, 0],
        metadata: {},
      }));

      mockKnowledgeChunkModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockChunks),
      });

      const results = await service.searchSimilar('query', {
        limit: 3,
        minScore: 0,
      });

      expect(results).toHaveLength(3);
    });
  });
});

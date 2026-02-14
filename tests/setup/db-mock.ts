/**
 * Prisma mock for unit and API tests.
 *
 * Usage in test files:
 *   vi.mock('@/lib/db', () => ({ db: prismaMock }));
 *
 * Then configure per-test:
 *   prismaMock.childProfile.findUnique.mockResolvedValue(fixtures.childMaya);
 */
import { vi } from 'vitest';

function createModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

export const prismaMock = {
  user: createModelMock(),
  childProfile: createModelMock(),
  lessonProgress: createModelMock(),
  session: createModelMock(),
  assessment: createModelMock(),
  placementDraft: createModelMock(),
  placementResult: createModelMock(),
  curriculum: createModelMock(),
  curriculumWeek: createModelMock(),
  curriculumRevision: createModelMock(),
  writingSubmission: createModelMock(),
  aIFeedback: createModelMock(),
  skillProgress: createModelMock(),
  streak: createModelMock(),
  achievement: createModelMock(),
  $transaction: vi.fn((fn: any) => fn(prismaMock)),
};

export function resetPrismaMock() {
  Object.values(prismaMock).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((method) => {
        if (typeof method === 'function' && 'mockReset' in method) {
          (method as any).mockReset();
        }
      });
    }
  });
}

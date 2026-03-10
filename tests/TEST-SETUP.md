# WriteWhiz — Test Suite Setup

## Install Dependencies

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react msw

# If not already installed
npm install --save-dev @types/node
```

## Configuration

### 1. Add `vitest.config.ts` to project root

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/app/api/**'],
      exclude: ['src/lib/llm/content/**'],
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 2. Add scripts to `package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run tests/unit",
    "test:api": "vitest run tests/api",
    "test:components": "vitest run tests/components"
  }
}
```

### 3. Test File Structure

```
tests/
├── TEST-SETUP.md              # This file
├── setup/
│   ├── vitest.setup.ts        # Global test setup
│   ├── db-mock.ts             # Prisma mock
│   ├── auth-mock.ts           # Auth session mock
│   ├── claude-mock.ts         # Claude API mock
│   └── fixtures.ts            # Shared test data
├── unit/
│   ├── lib/
│   │   ├── skill-map.test.ts
│   │   ├── progress-tracker.test.ts
│   │   ├── streak-tracker.test.ts
│   │   ├── badges.test.ts
│   │   ├── badge-checker.test.ts
│   │   └── curriculum-adapter.test.ts
│   └── llm/
│       ├── prompt-builder.test.ts
│       ├── rubrics.test.ts
│       ├── curriculum.test.ts
│       └── client.test.ts
├── api/
│   ├── auth/
│   │   └── signup.test.ts
│   ├── children/
│   │   ├── crud.test.ts
│   │   ├── progress.test.ts
│   │   ├── portfolio.test.ts
│   │   ├── skills.test.ts
│   │   ├── streak.test.ts
│   │   ├── badges.test.ts
│   │   └── report.test.ts
│   ├── lessons/
│   │   ├── start.test.ts
│   │   ├── message.test.ts
│   │   ├── submit.test.ts
│   │   └── revise.test.ts
│   ├── placement/
│   │   └── placement.test.ts
│   └── curriculum/
│       └── curriculum.test.ts
└── components/
    ├── CelebrationOverlay.test.tsx
    ├── SkillRadarChart.test.tsx
    └── StreakDisplay.test.tsx
```

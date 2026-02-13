import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Suppress console.log in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  vi.spyOn(console, 'log').mockImplementation(() => {});
}

// Ensure consistent timezone for date-related tests
process.env.TZ = 'UTC';

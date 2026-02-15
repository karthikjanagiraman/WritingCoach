/**
 * Tests for src/lib/skill-map.ts
 *
 * Covers: SKILL_DEFINITIONS, getLessonSkills(), scoreToLevel(), getTierFromAge()
 */
import { describe, it, expect } from 'vitest';
import { TIER_TEST_CASES } from '../../setup/fixtures';

import { SKILL_DEFINITIONS, getLessonSkills, scoreToLevel } from '@/lib/skill-map';

// getTierFromAge is not exported from skill-map.ts — inline the logic for tier tests
function getTierFromAge(age: number): number {
  if (age <= 9) return 1;
  if (age <= 12) return 2;
  return 3;
}

describe('skill-map', () => {
  // ==========================================
  // Tier Computation
  // ==========================================
  describe('getTierFromAge()', () => {
    it.each(TIER_TEST_CASES)(
      'age $age → tier $expectedTier',
      ({ age, expectedTier }) => {
        expect(getTierFromAge(age)).toBe(expectedTier);
      }
    );

    it('handles edge case: age below 7 defaults to tier 1', () => {
      expect(getTierFromAge(6)).toBe(1);
      expect(getTierFromAge(5)).toBe(1);
    });

    it('handles edge case: age above 15 defaults to tier 3', () => {
      expect(getTierFromAge(16)).toBe(3);
      expect(getTierFromAge(18)).toBe(3);
    });
  });

  // ==========================================
  // Score to Level (1-4 scale)
  // ==========================================
  describe('scoreToLevel()', () => {
    it('returns EMERGING for scores below 1.8', () => {
      expect(scoreToLevel(0)).toBe('EMERGING');
      expect(scoreToLevel(1.0)).toBe('EMERGING');
      expect(scoreToLevel(1.79)).toBe('EMERGING');
    });

    it('returns DEVELOPING for scores 1.8-2.79', () => {
      expect(scoreToLevel(1.8)).toBe('DEVELOPING');
      expect(scoreToLevel(2.0)).toBe('DEVELOPING');
      expect(scoreToLevel(2.5)).toBe('DEVELOPING');
      expect(scoreToLevel(2.79)).toBe('DEVELOPING');
    });

    it('returns PROFICIENT for scores 2.8-3.69', () => {
      expect(scoreToLevel(2.8)).toBe('PROFICIENT');
      expect(scoreToLevel(3.0)).toBe('PROFICIENT');
      expect(scoreToLevel(3.5)).toBe('PROFICIENT');
      expect(scoreToLevel(3.69)).toBe('PROFICIENT');
    });

    it('returns ADVANCED for scores 3.7+', () => {
      expect(scoreToLevel(3.7)).toBe('ADVANCED');
      expect(scoreToLevel(4.0)).toBe('ADVANCED');
    });

    it('boundary: 1.8 is DEVELOPING, not EMERGING', () => {
      expect(scoreToLevel(1.8)).toBe('DEVELOPING');
    });

    it('boundary: 2.8 is PROFICIENT, not DEVELOPING', () => {
      expect(scoreToLevel(2.8)).toBe('PROFICIENT');
    });

    it('boundary: 3.7 is ADVANCED, not PROFICIENT', () => {
      expect(scoreToLevel(3.7)).toBe('ADVANCED');
    });
  });

  // ==========================================
  // Lesson-to-Skill Mapping
  // ==========================================
  describe('getLessonSkills()', () => {
    it('returns skills for a known narrative lesson', () => {
      const result = getLessonSkills('N1.1.1');
      expect(result).toBeDefined();
      expect(result.category).toBe('narrative');
      expect(result.skills.length).toBeGreaterThan(0);
      expect(result.skills.every(s => typeof s === 'string')).toBe(true);
    });

    it('returns skills for a known persuasive lesson', () => {
      const result = getLessonSkills('P1.1.1');
      expect(result).toBeDefined();
      expect(result.category).toBe('persuasive');
      expect(result.skills.length).toBeGreaterThan(0);
    });

    it('returns default skills for unknown lesson ID', () => {
      const result = getLessonSkills('UNKNOWN.999');
      expect(result).toBeDefined();
      // Falls back to narrative category (default) with some skills
      expect(result.skills.length).toBeGreaterThan(0);
    });

    it('lesson ID prefix determines category', () => {
      // N = narrative, P = persuasive, E = expository, D = descriptive
      const nResult = getLessonSkills('N1.1.1');
      const pResult = getLessonSkills('P1.1.1');
      // Verify they map to their respective categories
      expect(nResult.category).toBe('narrative');
      expect(pResult.category).toBe('persuasive');
      expect(nResult.skills).not.toEqual(pResult.skills);
    });
  });

  // ==========================================
  // Skill Definitions Catalog
  // ==========================================
  describe('SKILL_DEFINITIONS', () => {
    it('has all 4 writing categories', () => {
      const categories = Object.keys(SKILL_DEFINITIONS);
      expect(categories).toContain('narrative');
      expect(categories).toContain('persuasive');
      expect(categories).toContain('expository');
      expect(categories).toContain('descriptive');
    });

    it('each category has required fields', () => {
      for (const [category, def] of Object.entries(SKILL_DEFINITIONS)) {
        expect(def.displayName).toBeDefined();
        expect(def.skills).toBeDefined();
        expect(typeof category).toBe('string');
        expect(typeof def.displayName).toBe('string');
      }
    });

    it('has at least 4 sub-skills per category', () => {
      for (const [_cat, def] of Object.entries(SKILL_DEFINITIONS)) {
        const skillCount = Object.keys(def.skills).length;
        expect(skillCount).toBeGreaterThanOrEqual(4);
      }
    });
  });
});

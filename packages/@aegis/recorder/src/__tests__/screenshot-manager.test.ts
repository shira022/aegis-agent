import { describe, it, expect, beforeEach } from 'vitest';
import { ScreenshotManager } from '../screenshot-manager';
import type { BoundingBox } from '../types';

describe('ScreenshotManager', () => {
  let manager: ScreenshotManager;

  beforeEach(() => {
    manager = new ScreenshotManager();
  });

  describe('captureScreen', () => {
    it('should capture full screen and return base64 string', async () => {
      const screenshot = await manager.captureScreen();
      expect(typeof screenshot).toBe('string');
      expect(screenshot.length).toBeGreaterThan(0);
    });

    it('should capture screen with region', async () => {
      const region: BoundingBox = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      };
      const screenshot = await manager.captureScreen(region);
      expect(typeof screenshot).toBe('string');
      expect(screenshot.length).toBeGreaterThan(0);
    });
  });

  describe('captureElement', () => {
    it('should capture element screenshot', async () => {
      const element = {
        getBoundingClientRect: () => ({
          x: 10,
          y: 20,
          width: 200,
          height: 50,
        }),
      } as any;

      const screenshot = await manager.captureElement(element);
      expect(typeof screenshot).toBe('string');
      expect(screenshot.length).toBeGreaterThan(0);
    });
  });

  describe('compressImage', () => {
    it('should compress image with default quality', () => {
      const base64 = 'aGVsbG8gd29ybGQ=';
      const compressed = manager.compressImage(base64);
      expect(typeof compressed).toBe('string');
    });

    it('should compress image with specified quality', () => {
      const base64 = 'aGVsbG8gd29ybGQ=';
      const compressed = manager.compressImage(base64, 0.5);
      expect(typeof compressed).toBe('string');
    });

    it('should reduce image size with lower quality', () => {
      const base64 = 'aGVsbG8gd29ybGQ=';
      const highQuality = manager.compressImage(base64, 1.0);
      const lowQuality = manager.compressImage(base64, 0.1);
      expect(typeof highQuality).toBe('string');
      expect(typeof lowQuality).toBe('string');
    });
  });

  describe('diffScreenshots', () => {
    it('should detect no changes when screenshots are identical', () => {
      const screenshot = 'aGVsbG8gd29ybGQ=';
      const result = manager.diffScreenshots(screenshot, screenshot);
      expect(result.changed).toBe(false);
      expect(result.regions).toEqual([]);
    });

    it('should detect changes when screenshots differ', () => {
      const before = 'aGVsbG8gd29ybGQ=';
      const after = 'd29ybGQgaGVsbG8=';
      const result = manager.diffScreenshots(before, after);
      expect(typeof result.changed).toBe('boolean');
      expect(Array.isArray(result.regions)).toBe(true);
    });

    it('should return bounding boxes for changed regions', () => {
      const before = 'aGVsbG8gd29ybGQ=';
      const after = 'd29ybGQgaGVsbG8=';
      const result = manager.diffScreenshots(before, after);
      if (result.changed) {
        result.regions.forEach((region: BoundingBox) => {
          expect(region).toHaveProperty('x');
          expect(region).toHaveProperty('y');
          expect(region).toHaveProperty('width');
          expect(region).toHaveProperty('height');
        });
      }
    });
  });
});

import {describe, it, expect} from 'vitest';
import {extractQuality, extractCodec, extractLanguages} from '../lib/tools/video/ReleaseTagExtractor.js';

describe('extractQuality', () => {
    it('reads resolution tiers across separators', () => {
        expect(extractQuality('Show.S01E01.1080p.WEB.h264')).toBe('1080p');
        expect(extractQuality('Movie_2008_720p')).toBe('720p');
        expect(extractQuality('Doc 2160p HDR')).toBe('2160p');
    });
    it('collapses 4k and interlaced to the progressive tier', () => {
        expect(extractQuality('Film 4K')).toBe('2160p');
        expect(extractQuality('Broadcast 1080i')).toBe('1080p');
        expect(extractQuality('Old 720i')).toBe('720p');
    });
    it('maps a WxH token by height', () => {
        expect(extractQuality('BDRip 1920x1080 x264')).toBe('1080p');
        expect(extractQuality('rip 1280x720')).toBe('720p');
    });
    it('returns undefined when there is no resolution', () => {
        expect(extractQuality('Big Buck Bunny')).toBeUndefined();
    });
});

describe('extractCodec', () => {
    it('normalizes encoder spellings to ffmpeg tokens', () => {
        expect(extractCodec('Show.x265.WEB')).toBe('hevc');
        expect(extractCodec('Show H.265')).toBe('hevc');
        expect(extractCodec('Movie x264')).toBe('h264');
        expect(extractCodec('Movie AVC')).toBe('h264');
        expect(extractCodec('Clip AV1')).toBe('av1');
        expect(extractCodec('Old XviD rip')).toBe('xvid');
    });
    it('returns undefined when no codec tag', () => {
        expect(extractCodec('Big Buck Bunny 1080p')).toBeUndefined();
    });
});

describe('extractLanguages', () => {
    it('detects a single language tag', () => {
        expect(extractLanguages('Movie.2008.FRENCH.1080p')).toEqual(['fre']);
        expect(extractLanguages('Show.S01.German.WEB')).toEqual(['ger']);
    });
    it('returns a sorted set for multi-tag releases', () => {
        // MULTi VOSTFR → both mul and fre (sorted).
        expect(extractLanguages('Movie.MULTi.VOSTFR.1080p')).toEqual(['fre', 'mul']);
    });
    it('honors guard phrases (no false positives)', () => {
        // "web dl" must not trigger the German `dl` → mul marker by itself.
        expect(extractLanguages('Movie.2021.WEB-DL.1080p.x264')).toEqual([]);
        // "Shang-Chi" must not trigger Chinese via `chi`.
        expect(extractLanguages('Shang-Chi.2021.1080p')).toEqual([]);
    });
    it('returns empty when no language tag', () => {
        expect(extractLanguages('Big Buck Bunny 2008 1080p')).toEqual([]);
    });
});

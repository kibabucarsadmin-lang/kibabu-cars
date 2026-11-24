import { describe, expect, it } from 'vitest';
import { defaultContent } from '../shared/content';
import { cleanBlog, cleanBusiness, cleanCar } from './clean';

describe('admin input sanitising', () => {
  const prev = defaultContent().business;
  it('rejects javascript: links in social fields', () => {
    const b = cleanBusiness({ ...prev, facebook: 'javascript:alert(1)', instagram: 'https://instagram.com/kibabu' }, prev);
    expect(b.facebook).not.toMatch(/javascript/i);
    expect(b.instagram).toBe('https://instagram.com/kibabu');
  });
  it('only accepts a real GA4 id', () => {
    expect(cleanBusiness({ ...prev, gaId: '"><script>' }, prev).gaId).toBe('');
    expect(cleanBusiness({ ...prev, gaId: 'G-ABC123XYZ' }, prev).gaId).toBe('G-ABC123XYZ');
    expect(cleanBusiness({ ...prev, adsId: 'aw-123456789', adsLabel: 'AbC-d_12' }, prev)).toMatchObject({ adsId: 'AW-123456789', adsLabel: 'AbC-d_12' });
    expect(cleanBusiness({ ...prev, adsId: 'AW-1"><x', adsLabel: '<script>' }, prev)).toMatchObject({ adsId: '', adsLabel: '' });
  });
  it('drops blog posts without a title', () => {
    expect(cleanBlog([{ title: '', blocks: [] }]).length).toBe(0);
  });
  it('never returns negative prices for cars', () => {
    const c = cleanCar({ name: 'Test', pricePerDay: -10, units: 1 });
    expect(c.pricePerDay).toBeGreaterThanOrEqual(0);
  });
});

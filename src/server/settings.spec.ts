import { describe, expect, it } from 'vitest';
import { db } from './db';
import { publicSettings, resendKey, seal, unseal } from './settings';

describe('admin settings secrets', () => {
  it('encrypts and decrypts, and rejects tampered data', () => {
    const s = seal('re_abc123456789XYZ');
    expect(s).not.toContain('re_abc');
    expect(unseal(s)).toBe('re_abc123456789XYZ');
    const parts = s.split('.');
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith('AA') ? 'BB' : 'AA');
    expect(unseal(parts.join('.'))).toBeNull();
    expect(unseal('nonsense')).toBeNull();
  });

  it('uses the saved key for sending but never shows it', () => {
    const key = 're_live_SECRET_9876abcd';
    db.write((d) => { d.settings = { resendKey: seal(key), resendKeyHint: '••••abcd' }; });
    expect(resendKey()).toBe(key);
    const shown = JSON.stringify(publicSettings());
    expect(shown).not.toContain('SECRET');
    expect(shown).toContain('••••abcd');
    expect(JSON.stringify(db.read())).not.toContain('SECRET'); // stored encrypted
    db.write((d) => { delete d.settings; });
  });
});

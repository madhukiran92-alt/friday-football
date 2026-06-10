import { INVITE_CODE_CHARS, INVITE_CODE_LENGTH, randomCode } from '../inviteCode';

describe('randomCode', () => {
  it('is 8 characters long', () => {
    expect(randomCode()).toHaveLength(INVITE_CODE_LENGTH);
  });

  it('only uses unambiguous characters (no 0/O or 1/I)', () => {
    for (let i = 0; i < 200; i++) {
      const code = randomCode();
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it('charset itself contains no ambiguous characters', () => {
    expect(INVITE_CODE_CHARS).not.toMatch(/[01OI]/);
  });

  it('produces different codes (collision sanity check)', () => {
    const codes = new Set(Array.from({ length: 100 }, randomCode));
    expect(codes.size).toBeGreaterThan(95);
  });
});

import { describe, expect, it } from 'vitest';
import { addDays, maskName, maskPhone, paymentStatus, SKIPPABLE, STATUS_ORDER } from '../src/lib/util';

describe('paymentStatus', () => {
  it('belum lunas / dp / lunas', () => {
    expect(paymentStatus(36400, 0)).toBe('belum_lunas');
    expect(paymentStatus(36400, 10000)).toBe('dp');
    expect(paymentStatus(36400, 36400)).toBe('lunas');
  });
  it('DP + pelunasan tidak dihitung ganda', () => {
    expect(paymentStatus(36400, 10000 + 26400)).toBe('lunas');
  });
});
describe('masking tracking publik', () => {
  it('menyamarkan nama dan telepon', () => {
    expect(maskName('Budi Santoso')).toBe('B*** S******');
    expect(maskPhone('081234567890')).not.toContain('567');
    expect(maskPhone('081234567890').endsWith('890')).toBe(true);
  });
});
describe('alur status', () => {
  it('urutan benar & tahap opsional dapat dilewati', () => {
    expect(STATUS_ORDER[0]).toBe('diterima');
    expect(SKIPPABLE.has('penyetrikaan')).toBe(true);
    expect(SKIPPABLE.has('sedang_dicuci')).toBe(false);
  });
  it('addDays lintas bulan', () => expect(addDays('2026-01-31', 1)).toBe('2026-02-01'));
});

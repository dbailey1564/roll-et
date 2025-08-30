import { describe, it, expect } from 'vitest'
import { clampInt, fmtUSD, fmtUSDSign } from '../utils'

describe('utils', () => {
  describe('clampInt', () => {
    it('clamps values to range and floors', () => {
      expect(clampInt(5.7, 0, 10)).toBe(5)
      expect(clampInt(-2, 0, 10)).toBe(0)
      expect(clampInt(20, 0, 10)).toBe(10)
      expect(clampInt(Infinity, 0, 10)).toBe(0)
    })
  })

  describe('fmtUSD', () => {
    it('formats credits as USD', () => {
      expect(fmtUSD(4)).toMatch(/\$1\.00/)
    })
  })

  describe('fmtUSDSign', () => {
    it('includes sign and formats', () => {
      expect(fmtUSDSign(4)).toMatch(/^\+.*\$1\.00/)
      expect(fmtUSDSign(-4)).toMatch(/^−.*\$1\.00/)
    })
  })
})

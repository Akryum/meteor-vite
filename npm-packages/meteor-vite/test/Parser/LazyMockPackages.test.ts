import { describe, expect, it } from 'vitest'
import { parseMeteorPackage } from '../../src/meteor/package/parser/Parser'
import { LazyLoadedPackage } from '../__mocks'

describe('lazy-loaded packages', () => {
  describe('before being auto-imported', async () => {
    Object.entries(LazyLoadedPackage.packages).forEach(([_key, lazyMock]) => {
      describe(lazyMock.packageName, async () => {
        const { result: parserResult } = await parseMeteorPackage(lazyMock)

        it('parsed the package name', () => {
          expect(parserResult.name).toEqual(lazyMock.packageName)
        })
      })
    })
  })
})

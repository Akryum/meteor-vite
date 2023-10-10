// This should emit a warning/error message in the console, since the export is undefined.
import { IAmUndefined } from 'meteor/test:stub-validation'
import { describe, expect, it } from 'ts-minitest'

export default () => describe('Stub validation', () => {
  it('can import and use an undefined stub when configured for warnOnly', () => {
    expect(IAmUndefined).toBe(undefined)
  })
})

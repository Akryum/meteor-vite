import { b, c, FIRST, first, namedFunction } from 'meteor/test:ts-modules';
import { assert, describe, it, testSuite } from './lib';

testSuite('Meteor modules', () => {
    describe('named exports', () => {
        
        it('does not collide with uppercase and lowercase exports', () => {
            assert.equal(FIRST, 'UPPERCASE');
            assert.equal(first, 'lowercase');
        });
        
        it('can parse export { foo, bar } syntax', () => {
            assert.equal(b, 2);
            assert.equal(c, 3);
        });
        
        it('can parse named functions', () => {
            assert.equal(typeof namedFunction, 'function');
        });
    })
})

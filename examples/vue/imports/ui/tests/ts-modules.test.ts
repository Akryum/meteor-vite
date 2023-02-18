import { b, c, FIRST, first, namedFunction } from 'meteor/test:ts-modules';
import { describe, it, expect } from 'ts-minitest';

Meteor.startup(() => {
    setTimeout(() => runTests(), 500)
})

function runTests() {
    describe('named exports', () => {
        
        it('does not collide with uppercase and lowercase exports', () => {
            expect(FIRST).toBe('UPPERCASE');
            expect(first).toBe('lowercase');
        });
        
        it('can parse export { foo, bar } syntax', () => {
            expect(b).toBe(2);
            expect(c).toBe(3);
        });
        
        it('can parse named functions', () => {
            expect(typeof namedFunction).toBe('function');
        });
    })
}


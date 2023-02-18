export function describe(name: string, fn: () => void) {
    try {
        fn();
    } catch (error: any) {
        throw new NestedError(`❌ ${name}`, error);
    }
}

class NestedError extends Error {
    constructor(message: string, public readonly error: Error) {
        if (error instanceof NestedError) {
            message = `${message}\n\t${error.message}`;
        }
        super(message);
    }
}

class AssertionError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export function it(name: string, test: () => void) {
    try {
        test();
        console.log(`✅ Test passed: ${name}`);
    } catch (e: any) {
        console.error(`❌ Test failed: ${name}`);
        throw new Error(e.message);
    }
}

export const assert = {
    equal: (a: any, b: any) => {
        if (a !== b) {
            throw new AssertionError(`Expected ${a} to equal ${b}`);
        }
    },
};

export function testSuite(name: string, suite: () => void) {
    try {
        describe(name, suite);
    } catch (error) {
        console.error(error);
    }
}
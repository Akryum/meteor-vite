import Logger from '../../Logger';
import ViteLoadRequest, { RefreshNeeded } from '../ViteLoadRequest';
import { MeteorViteError } from './MeteorViteError';

export function createErrorHandler(fallbackDescription: string, request?: ViteLoadRequest) {
    return async (error: unknown): Promise<never> => {
        const viteError = await formatError(fallbackDescription, error);
        
        if (request) {
            viteError.setContext(request);
        }
        
        if (viteError instanceof RefreshNeeded) {
            return handleRefreshNeeded(viteError);
        }
        
        await viteError.beautify()
        throw error;
    }
}

function formatError(fallbackDescription: string, error: unknown | Error) {
    if (!(error instanceof Error)) {
        return new MeteorViteError('Received an unexpected error format!', { cause: error });
    }
    
    if (!(error instanceof MeteorViteError)) {
        return new MeteorViteError(fallbackDescription, {
            cause: error,
        })
    }
    
    return error;
}

let lastEmittedWarning = Date.now();
function handleRefreshNeeded(error: RefreshNeeded): never {
    if (1000 < Date.now() - lastEmittedWarning) {
        console.warn(error.message);
        process.emitWarning('Refresh needed!', error.constructor.name);
        lastEmittedWarning = Date.now();
    }
    throw error;
}
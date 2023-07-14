import ViteLoadRequest from '../ViteLoadRequest';
import { MeteorViteError } from './MeteorViteError';

export function createErrorHandler(fallbackDescription: string, request?: ViteLoadRequest) {
    return async (error: unknown): Promise<never> => {
        const viteError = await formatError(fallbackDescription, error);
        
        if (request) {
            viteError.setContext(request);
        }
        
        await viteError.beautify()
        throw error;
    }
}

function formatError(fallbackDescription: string, error: unknown | Error) {
    if (!(error instanceof Error)) {
        throw new MeteorViteError('Received an unexpected error format!', { cause: error });
    }
    
    if (!(error instanceof MeteorViteError)) {
        return new MeteorViteError(fallbackDescription, {
            cause: error,
        })
    }
    
    return error;
}
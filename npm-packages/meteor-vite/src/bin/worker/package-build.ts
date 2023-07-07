// A utility worker for development of the meteor-vite package.
// Just watches the contents of this package and re-compiles if there's any changes.
// Todo: Maybe trigger a reload on Meteor as well

import { spawn } from 'child_process';
import Path from 'path';
import CreateIPCInterface from './IPC/interface';

export default CreateIPCInterface({
    async 'tsup.watchMeteorVite'(reply, { cwd }: { cwd: string }) {
        const npmPackagePath = Path.join(cwd, '/node_modules/meteor-vite/') // to the meteor-vite npm package
        const tsupPath = Path.join(cwd, '/node_modules/.bin/tsup'); // tsup to 2 node_modules dirs down.
        
        const child = spawn(tsupPath, ['--watch'], {
            stdio: 'inherit',
            cwd: npmPackagePath,
            env: {
                FORCE_COLOR: '3',
            },
        });
        
        child.on('error', (error) => {
            throw new Error(`meteor-vite package build worker error: ${error.message}`, { cause: error })
        });
        
        child.on('exit', (code) => {
            if (!code) {
                return;
            }
            process.exit(1);
            throw new Error('TSUp watcher exited unexpectedly!');
        });
    }
})
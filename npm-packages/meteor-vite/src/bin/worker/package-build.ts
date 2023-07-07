// A utility worker for development of the meteor-vite package.
// Just watches the contents of this package and re-compiles if there's any changes.
// Todo: Maybe trigger a reload on Meteor as well

import { spawn } from 'child_process';
import Path from 'path';
import CreateIPCInterface from './IPC/interface';

export default CreateIPCInterface({
    async 'tsup.watchMeteorVite'() {
        const cwd = Path.join(process.cwd(), '/node_modules/meteor-vite/');
        const child = spawn('meteor', ['npm', 'run', 'watch'], {
            stdio: 'inherit',
            // Relies on a symlink from npm to get into npm package source.
            cwd,
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
            
            throw new Error('TSUp watcher exited unexpectedly!');
        });
    }
})
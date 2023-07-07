// A utility worker for development of the meteor-vite package.
// Just watches the contents of this package and re-compiles if there's any changes.
// Todo: Maybe trigger a reload on Meteor as well

import { spawn } from 'child_process';
import Path from 'path';
import CreateIPCInterface from './IPC/interface';

CreateIPCInterface({
    async 'tsup.watchMeteorVite'() {
        const child = spawn('meteor', ['npm', 'run', 'watch'], {
            stdio: 'inherit',
            // Relies on a symlink from npm to get into npm package source.
            cwd: Path.join(process.cwd(), '/node_modules/meteor-vite')
        });
        
        child.on('exit', (code) => {
            if (!code) {
                return;
            }
            
            throw new Error('Tsup watcher exited unexpectedly!');
        });
    }
})
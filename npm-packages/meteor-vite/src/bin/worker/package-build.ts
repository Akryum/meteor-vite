// A utility worker for development of the meteor-vite package.
// Just watches the contents of this package and re-compiles if there's any changes.
// Todo: Maybe trigger a reload on Meteor as well

import { spawn } from 'child_process';
import FS from 'fs/promises';
import Path from 'path';
import CreateIPCInterface from './IPC/interface';

export default CreateIPCInterface({
    async 'tsup.watchMeteorVite'() {
        const cwd = Path.join(process.cwd(), '/node_modules/meteor-vite/');
        const tsupPath = Path.join(cwd, '/node_modules/.bin/tsup');
        
        const child = spawn(tsupPath, ['--watch'], {
            stdio: 'inherit',
            // Relies on a symlink from npm to get into npm package source.
            cwd,
            detached: false,
            env: {
                FORCE_COLOR: '3',
                PATH: process.env.PATH
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
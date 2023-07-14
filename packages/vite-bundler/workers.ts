import { fork } from 'node:child_process'
import { Meteor } from 'meteor/meteor';
import Path from 'path';
import FS from 'fs';
import * as process from 'process';
import type { WorkerMethod, WorkerResponse } from '../../npm-packages/meteor-vite';
import type { WorkerResponseHooks } from '../../npm-packages/meteor-vite/src/bin/worker';
import type { ProjectJson } from '../../npm-packages/meteor-vite/src/vite/plugin/MeteorStubs';

// Use a worker to skip reify and Fibers
// Use a child process instead of worker to avoid WASM/archived threads error
export function createWorkerFork(hooks: Partial<WorkerResponseHooks>) {
    if (!FS.existsSync(workerPath)) {
        throw new Error(`Unable to locate Meteor-Vite workers! Make sure you've installed the 'meteor-vite' npm package: \n  $ npm i -D meteor-vite`)
    }
    
    const child = fork(workerPath, ['--enable-source-maps'], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        cwd,
        detached: false,
        env: {
            FORCE_COLOR: '3',
        },
    });
    
    const hookMethods = Object.keys(hooks) as (keyof typeof hooks)[];
    hookMethods.forEach((method) => {
        const hook = hooks[method];
        if (typeof hook !== 'function') return;
        (hooks[method] as typeof hook) = Meteor.bindEnvironment(hook);
    })
    
    child.on('message', (message: WorkerResponse & { data: any }) => {
        const hook = hooks[message.kind];
        
        if (typeof hook !== 'function') {
            return console.warn('Meteor: Unrecognized worker message!', { message });
        }
        
        return hook(message.data);
    });
    
    ['exit', 'SIGINT', 'SIGHUP', 'SIGTERM'].forEach(event => {
        process.once(event, () => {
            child.kill()
        })
    });
    
    return {
        call(method: Omit<WorkerMethod, 'replies'>) {
            child.send(method);
        },
        child,
    }
}

export const cwd = process.env.METEOR_VITE_CWD ?? guessCwd();
export const workerPath = Path.join(cwd, 'node_modules/meteor-vite/dist/bin/worker/index.mjs');
export const projectPackageJson = getProjectPackageJson();
function getProjectPackageJson(): ProjectJson {
    const path = Path.join(cwd, 'package.json');
    
    if (!FS.existsSync(path)) {
        const errorMessage = [
            `[Meteor-Vite] Unable to locate package.json for your project in ${path}`,
            `Make sure you run Meteor commands from the root of your project directory.`,
            `Alternatively, you can supply a superficial CWD for Meteor-Vite to use: METEOR_VITE_CWD="./projects/my-meteor-project/"`
        ]
        throw new Error(errorMessage.join('\n    '))
    }
    
    return JSON.parse(FS.readFileSync(path, 'utf-8'));
}
function guessCwd () {
    let cwd = process.env.PWD ?? process.cwd()
    const index = cwd.indexOf('.meteor')
    if (index !== -1) {
        cwd = cwd.substring(0, index)
    }
    return cwd
}

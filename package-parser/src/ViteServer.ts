import FS from 'fs';
import Path from 'path';
import { createServer } from 'vite';
import { MeteorStubs } from './VitePlugin/MeteorStubs';

const projectRoot = Path.join(__dirname, '../../examples/vue/');

export default createServer({
    root: projectRoot,
    plugins: [
        MeteorStubs({
            meteorPackagePath: Path.join(projectRoot, '.meteor', 'local', 'build', 'programs', 'web.browser', 'packages'),
            projectJsonContent: FS.readFileSync(Path.join(projectRoot, 'package.json'), 'utf-8'),
        })
    ]
});
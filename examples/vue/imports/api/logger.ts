import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import safeJson from 'safe-json-stringify';
import Chalk from 'chalk';
import util from 'util';
const chalk = new Chalk.Instance({ level: 3 });

interface LogEntry {
    createdAt: Date;
    level: LogLevel;
    args: any[];
}

export const LogsCollection = new Mongo.Collection<LogEntry>('log-entries');

if (Meteor.isServer) {
    LogsCollection.allow({
        insert(userId, entry: LogEntry) {
            const logFunction = console[entry.level];
            const message = util.format(...entry.args.map(arg => JSON.parse(arg)));
            if (!isLogMethod(entry.level, logFunction)) {
                console.warn('Unknown "%s" log level from client', entry.level, message)
                return false;
            }
            const labelledMessage = message.split(/[\n\r]+/)
                .map((line) => `[${chalk.bold.cyan('Client')}] ${line}`)
                .join('\n');
            process.stdout.write(labelledMessage + '\n');
            return true;
        }
    })
}

export const Logger: typeof console = new Proxy(console, {
    get(target, level: LogLevel) {
        const value = target[level as keyof typeof console];
        
        if (!isLogMethod(level, value)) {
            return value;
        }
        
        return (...args: any[]) => {
            LogsCollection.insert({
                createdAt: new Date(),
                level,
                args: args.map(arg => safeJson(arg)),
            });
            value(...args);
        }
    }
});

export function WrapConsole() {
    if (!Meteor.isClient) {
        throw new Error('wrapConsole() can only be called on the client');
    }
    
    for (const level of loggableLevels) {
        Object.defineProperty(window.console, level, {
            value: Logger[level],
        })
    }
}

type LogLevel = typeof loggableLevels[number];
const loggableLevels = [ 'log', 'info', 'warn', 'error'] as const;
function isLogMethod(level: LogLevel | string, value: any): value is typeof console[LogLevel]  {
    return loggableLevels.includes(level as LogLevel);
}

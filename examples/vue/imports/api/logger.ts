import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import safeJson from 'safe-json-stringify';
import Chalk from 'chalk';
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
            if (!isLogLevel(entry.level, logFunction)) {
                console.warn('Unknown "%s" log level from client', entry.level, { args: entry.args })
                return false;
            }
            logFunction(chalk.bold.cyan('Log from client:'), ...entry.args);
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

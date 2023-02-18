import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
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
    get(target, prop) {
        const value = target[prop as keyof typeof console];
        
        if (!isLogLevel(prop as string, value)) {
            return value;
        }
        
        return (...args: any[]) => {
            LogsCollection.insert({
                createdAt: new Date(),
                level: prop as LogLevel,
                args,
            });
            value(...args);
        }
    }
})

type LogLevel = typeof loggableLevels[number];
const loggableLevels = [ 'log', 'info', 'warn', 'error'] as const;
function isLogLevel(level: LogLevel | string, value: any): value is typeof console[LogLevel]  {
    return loggableLevels.includes(level as LogLevel);
}

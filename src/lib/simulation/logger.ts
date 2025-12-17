// Simple logger wrapper that avoids worker thread issues in Next.js
// Uses console methods but maintains pino-like API

type LogFn = {
	(msg: string): void;
	(obj: any, msg?: string): void;
};

interface Logger {
	info: LogFn;
	debug: LogFn;
	warn: LogFn;
	error: LogFn;
}

const createLogFn = (level: 'info' | 'debug' | 'warn' | 'error'): LogFn => {
	const fn = (obj: any, msg?: string) => {
		const timestamp = new Date().toISOString();
		if (typeof obj === 'string') {
			// Called as logger.info('message')
			console[level](`[${timestamp}] [${level.toUpperCase()}]`, obj);
		} else {
			// Called as logger.info({ data }, 'message')
			console[level](`[${timestamp}] [${level.toUpperCase()}]`, msg || '', obj);
		}
	};
	return fn as LogFn;
};

export const logger: Logger = {
	info: createLogFn('info'),
	debug: createLogFn('debug'),
	warn: createLogFn('warn'),
	error: createLogFn('error')
};

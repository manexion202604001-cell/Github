type Level = 'debug' | 'info' | 'warn' | 'error'
type Fields = Record<string, unknown>

function emit(level: Level, message: string, fields?: Fields): void {
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (message: string, fields?: Fields) => {
    if (process.env.NODE_ENV !== 'production') emit('debug', message, fields)
  },
  info: (message: string, fields?: Fields) => emit('info', message, fields),
  warn: (message: string, fields?: Fields) => emit('warn', message, fields),
  error: (message: string, fields?: Fields) => emit('error', message, fields),
}

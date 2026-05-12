const PRETTY = process.env.LOG_PRETTY === 'true';

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  magenta:'\x1b[35m',
  white:  '\x1b[37m',
};

const LEVELS = {
  info:    { prefix: `${C.blue}[INFO]${C.reset}`,    plain: '[INFO]'    },
  ok:      { prefix: `${C.green}[OK]${C.reset}`,     plain: '[OK]'      },
  warn:    { prefix: `${C.yellow}[WARN]${C.reset}`,  plain: '[WARN]'    },
  error:   { prefix: `${C.red}[ERROR]${C.reset}`,    plain: '[ERROR]'   },
  lead:    { prefix: `${C.magenta}[LEAD]${C.reset}`, plain: '[LEAD]'    },
  sheet:   { prefix: `${C.cyan}[SHEET]${C.reset}`,   plain: '[SHEET]'   },
  wa:      { prefix: `${C.green}[WA]${C.reset}`,     plain: '[WA]'      },
  ai:      { prefix: `${C.magenta}[IA]${C.reset}`,   plain: '[IA]'      },
  seed:    { prefix: `${C.cyan}[SEED]${C.reset}`,    plain: '[SEED]'    },
  db:      { prefix: `${C.blue}[DB]${C.reset}`,      plain: '[DB]'      },
};

function log(level, message, meta) {
  const ts = new Date().toLocaleTimeString('es-AR', { hour12: false });
  const lvl = LEVELS[level] || LEVELS.info;

  if (PRETTY) {
    const tsStr = `${C.dim}${ts}${C.reset}`;
    const metaStr = meta ? ` ${C.dim}${typeof meta === 'object' ? JSON.stringify(meta) : meta}${C.reset}` : '';
    console.log(`${tsStr} ${lvl.prefix} ${message}${metaStr}`);
  } else {
    const metaStr = meta ? ` ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
    console.log(`${ts} ${lvl.plain} ${message}${metaStr}`);
  }
}

module.exports = {
  info:  (msg, meta) => log('info',  msg, meta),
  ok:    (msg, meta) => log('ok',    msg, meta),
  warn:  (msg, meta) => log('warn',  msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  lead:  (msg, meta) => log('lead',  msg, meta),
  sheet: (msg, meta) => log('sheet', msg, meta),
  wa:    (msg, meta) => log('wa',    msg, meta),
  ai:    (msg, meta) => log('ai',    msg, meta),
  seed:  (msg, meta) => log('seed',  msg, meta),
  db:    (msg, meta) => log('db',    msg, meta),
};

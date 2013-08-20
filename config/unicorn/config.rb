UNICORN_CONFIG = {
  development: {
    port:    8080,
    workers: 2,
    pidfile: '/tmp/oursignal-unicorn.pid',
  },
  production: {
    socket:  '/tmp/oursignal-unicorn.sock',
    pidfile: '/tmp/oursignal-unicorn.pid',
    stderr:  '/home/oursignal/oursignal-unicorn.stderr.log',
    stdout:  '/home/oursignal/oursignal-unicorn.stdout.log',
    backlog: 1024,
    workers: 4,
  },
}

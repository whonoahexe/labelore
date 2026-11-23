// A Node preload (node --import) that records every outbound socket connection the process makes.
// When CONNECT_RECORD_FILE is set it appends one line per connect, "<pid> <host>:<port>" (a unix socket
// path is recorded as "<path>:"), before handing the call to the original connect, so the process behaves
// exactly as without it. The launcher test runs the real launcher with this preloaded and asserts that
// every recorded target is its own server, which proves it probes nothing else. When the variable is
// unset it records nothing. It imports nothing from the repository.
import { appendFileSync } from 'node:fs';
import net from 'node:net';

const file = process.env.CONNECT_RECORD_FILE;
const original = net.Socket.prototype.connect;

net.Socket.prototype.connect = function recordedConnect(...args) {
  if (file) {
    // Node passes the normalized form ([options, callback]) when it calls connect internally.
    const first = Array.isArray(args[0]) ? args[0][0] : args[0];
    let host = '';
    let port = '';
    if (first !== null && typeof first === 'object') {
      host = first.path ?? first.host ?? 'localhost';
      port = first.port ?? '';
    } else if (typeof first === 'number' || typeof first === 'string') {
      port = String(first);
      host = typeof args[1] === 'string' ? args[1] : 'localhost';
    }
    appendFileSync(file, `${process.pid} ${host}:${port}\n`);
  }
  return original.apply(this, args);
};

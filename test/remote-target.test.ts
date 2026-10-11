import { describe, expect, it } from 'vitest';
import {
  buildMirrorCommands,
  classifyMirrorResult,
  parseRemoteTarget,
  quoteForRemoteShell,
  type MirrorRunResult,
  type RemoteTarget,
} from '../src/cli/remote-target.ts';

function remote(raw: string): RemoteTarget {
  const parsed = parseRemoteTarget(raw);
  if (parsed.kind !== 'remote') throw new Error(`expected remote for ${raw}, got ${parsed.kind}`);
  return parsed.target;
}

describe('parseRemoteTarget: URL forms', () => {
  it('parses the reported sftp address', () => {
    const address = 'sftp://rhgpu.taile250fc.ts.net/mnt/REACH/deid-template-studio';
    const target = remote(address);
    expect(target).toMatchObject({
      scheme: 'sftp',
      host: 'rhgpu.taile250fc.ts.net',
      user: null,
      port: null,
      remoteRoot: '/mnt/REACH/deid-template-studio',
      label: address,
    });
  });

  it('handles scheme case, user, port, encoding and a .planning suffix', () => {
    const target = remote('SSH://noah@host:2222/a%20b/.planning/');
    expect(target).toMatchObject({
      scheme: 'ssh',
      user: 'noah',
      port: 2222,
      host: 'host',
      remoteRoot: '/a b',
      label: 'ssh://noah@host:2222/a b',
    });
  });

  it('treats /~ paths as home-relative', () => {
    expect(remote('sftp://h/~/proj')).toMatchObject({ remoteRoot: './proj', label: 'sftp://h/~/proj' });
    expect(remote('sftp://h/~').remoteRoot).toBe('.');
  });

  it('strips IPv6 brackets for ssh and keeps them in the label', () => {
    expect(remote('sftp://[::1]:22/x')).toMatchObject({ host: '::1', label: 'sftp://[::1]:22/x' });
  });
});

describe('parseRemoteTarget: scp-style', () => {
  it('parses host:/abs/path', () => {
    const address = 'rhgpu.taile250fc.ts.net:/mnt/REACH/deid-template-studio';
    expect(remote(address)).toMatchObject({
      scheme: 'scp',
      port: null,
      remoteRoot: '/mnt/REACH/deid-template-studio',
      label: address,
    });
  });

  it('parses user@host with a .planning suffix', () => {
    expect(remote('noah@host:/p/.planning')).toMatchObject({
      scheme: 'scp',
      user: 'noah',
      host: 'host',
      remoteRoot: '/p',
      label: 'noah@host:/p',
    });
  });

  it('parses home-relative host:~/path', () => {
    expect(remote('host:~/proj')).toMatchObject({ remoteRoot: './proj', label: 'host:~/proj' });
  });
});

describe('parseRemoteTarget: local paths stay local', () => {
  it.each([
    '/abs/path',
    './rel',
    'rel/dir',
    '~/x',
    '~',
    '.',
    'fixtures/sparse-empty',
    'C:/x',
    'host:relative',
    'sftp:/one-slash',
  ])('%s', (raw) => {
    expect(parseRemoteTarget(raw)).toEqual({ kind: 'local' });
  });
});

describe('parseRemoteTarget: invalid addresses', () => {
  it('rejects a password and never echoes it', () => {
    const parsed = parseRemoteTarget('sftp://u:secret@h/x');
    expect(parsed.kind).toBe('invalid');
    if (parsed.kind !== 'invalid') return;
    expect(parsed.status.status).toBe('path-not-found');
    expect(parsed.status.message).toContain('u:***@h');
    expect(parsed.status.message).not.toContain('secret');
    if (parsed.status.status === 'path-not-found') {
      expect(parsed.status.rawPath).toContain('u:***@h');
      expect(parsed.status.rawPath).not.toContain('secret');
    }
  });

  it.each([
    'sftp://h',
    'sftp://h/',
    'sftp://-oProxyCommand=x/y',
    'sftp://-badhost/x',
    'sftp://ba%20d@h/x',
    'sftp://h:0/x',
    'sftp://h/x?y=1',
    'sftp://h/x#frag',
    'sftp://h/x%0Ay',
    'sftp://h/%E0%A4',
    'host:/',
  ])('%s', (raw) => {
    const parsed = parseRemoteTarget(raw);
    expect(parsed.kind).toBe('invalid');
    if (parsed.kind === 'invalid') expect(parsed.status.status).toBe('path-not-found');
  });
});

describe('quoteForRemoteShell', () => {
  it('single-quotes values and escapes embedded quotes', () => {
    expect(quoteForRemoteShell('/a b')).toBe("'/a b'");
    expect(quoteForRemoteShell("it's")).toBe("'it'\\''s'");
  });

  it.each(['$(touch x)', '`id`', ';rm -rf ~'])('keeps %s verbatim inside quotes', (value) => {
    expect(quoteForRemoteShell(value)).toBe(`'${value}'`);
  });
});

describe('buildMirrorCommands', () => {
  const template = (q: string) =>
    `[ -e ${q} ] || exit 65; [ -d ${q} ] || exit 66; cd ${q} || exit 67; [ -d .planning ] || exit 68; exec tar -cf - .planning`;

  it('builds the exact ssh and tar argv', () => {
    const target = remote('ssh://noah@host:2222/p q');
    const commands = buildMirrorCommands(target, '/tmp/d');
    expect(commands.ssh.command).toBe('ssh');
    expect(commands.ssh.args).toEqual([
      '-T',
      '-o',
      'BatchMode=yes',
      '-o',
      'ConnectTimeout=15',
      '-o',
      'Compression=yes',
      '-p',
      '2222',
      '-l',
      'noah',
      '--',
      'host',
      template("'/p q'"),
    ]);
    expect(commands.tar).toEqual({
      command: 'tar',
      args: ['-x', '-f', '-', '-C', '/tmp/d', '--no-same-owner', '--no-same-permissions', '.planning'],
    });
    expect(commands.destDir).toBe('/tmp/d');
  });

  it('omits -p and -l without a user or port, and keeps -- before the host', () => {
    const commands = buildMirrorCommands(remote('sftp://host/p'), '/tmp/d');
    expect(commands.ssh.args).not.toContain('-p');
    expect(commands.ssh.args).not.toContain('-l');
    const dashes = commands.ssh.args.indexOf('--');
    expect(commands.ssh.args[dashes + 1]).toBe('host');
    expect(commands.ssh.args.at(-1)).toContain('exec tar -cf - .planning');
  });
});

describe('classifyMirrorResult', () => {
  const target = remote('sftp://rhgpu.example/srv/proj');
  const base: MirrorRunResult = {
    sshExit: 0,
    tarExit: 0,
    sshStderr: '',
    tarStderr: '',
    timedOut: false,
    spawnError: null,
  };
  const classify = (over: Partial<MirrorRunResult>, mirrorHasPlanning = true) =>
    classifyMirrorResult({ ...base, ...over }, target, mirrorHasPlanning, 120_000);

  function failed(over: Partial<MirrorRunResult>, mirrorHasPlanning = true) {
    const outcome = classify(over, mirrorHasPlanning);
    if (outcome.ok) throw new Error('expected a failure');
    return outcome.status;
  }

  it('maps the remote exit codes', () => {
    expect(failed({ sshExit: 65 }).status).toBe('path-not-found');
    expect(failed({ sshExit: 65 }).message).toContain('/srv/proj');
    const file = failed({ sshExit: 66 });
    expect(file.status).toBe('path-not-found');
    expect(file.message).toContain('is a file, not a directory');
    expect(failed({ sshExit: 67 }).status).toBe('permission-denied');
    expect(failed({ sshExit: 68 }).status).toBe('not-a-gsd-project');
  });

  it('maps ssh failures', () => {
    expect(failed({ sshExit: 255, sshStderr: 'Permission denied (publickey).' }).status).toBe('permission-denied');
    expect(failed({ sshExit: 255, sshStderr: 'Host key verification failed.' }).status).toBe('permission-denied');
    const unreachable = failed({ sshExit: 255, sshStderr: 'ssh: Could not resolve hostname rhgpu.example' });
    expect(unreachable.status).toBe('path-not-found');
    expect(unreachable.message).toContain('Could not resolve hostname');
  });

  it('maps timeouts, spawn errors and unknown exits', () => {
    expect(failed({ timedOut: true }).message).toContain('Timed out after 120 s');
    const spawn = failed({ spawnError: { which: 'ssh', message: 'spawn ssh ENOENT' } });
    expect(spawn.status).toBe('path-not-found');
    expect(spawn.message).toContain('could not start ssh');
    expect(failed({ sshExit: 127 }).status).toBe('path-not-found');
  });

  it('accepts exit 1 with a warning, rejects a bad tar exit or a missing mirror', () => {
    const outcome = classify({ sshExit: 1, sshStderr: 'tar: .planning: file changed as we read it' });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.remoteWarning).toContain('file changed');
    const clean = classify({});
    expect(clean.ok && clean.remoteWarning).toBeNull();
    expect(failed({ tarExit: 2 }).status).toBe('path-not-found');
    expect(failed({}, false).status).toBe('path-not-found');
  });

  it('strips ANSI sequences and caps the excerpt', () => {
    const colored = failed({ sshExit: 255, sshStderr: '\u001b[31mboom\u001b[0m\nline' });
    expect(colored.message).toContain('boom line');
    expect(colored.message).not.toContain('\u001b');
    const long = failed({ sshExit: 255, sshStderr: 'x'.repeat(1000) });
    expect(long.message.endsWith(`${'x'.repeat(400)}…`)).toBe(true);
  });

  it('always reports the label as pathChecked', () => {
    for (const over of [{ sshExit: 65 }, { sshExit: 67 }, { sshExit: 68 }, { sshExit: 255 }, { timedOut: true }]) {
      expect(failed(over).pathChecked).toBe(target.label);
    }
  });
});

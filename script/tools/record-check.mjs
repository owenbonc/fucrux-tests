// Records the screenplay format check's own output as a file in the
// repository, and verifies that the recording still matches a live run.
//
// The reason this exists: the verdict "zero format violations" is worth only
// as much as the run that produced it. A reader of the repository — or of a
// diff — can see the checker's assertions, but not its output. So the output
// is checked in, at script/tools/check-report.txt, and re-derived:
//
//   node script/tools/record-check.mjs --write   # re-run, overwrite the file
//   node script/tools/record-check.mjs           # re-run, diff, exit 1 if stale
//   node script/tools/record-check.mjs <path>    # ...against some other copy
//
// The verifying form runs as part of `npm run check`, and again from the test
// suite, so the recorded transcript cannot drift from the screenplay on disk:
// change the screenplay and the check fails until the transcript is rewritten
// from a real run.
//
// It spawns the linter, never npm, so it is safe to call from inside the test
// suite that `npm run check` also runs.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Repository root, from this file's location. */
export const REPO = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

/** Where the transcript lives, repo-relative and in POSIX form. */
export const REPORT_PATH = 'script/tools/check-report.txt';

/**
 * The checked command, as its arguments relative to the repository root. The
 * paths are relative so that the transcript is identical on every machine.
 */
export const CHECK_ARGV = [
  'script/tools/screenplay-lint.mjs',
  'script/the-atlas-of-severed-hours.txt',
];

/** The command as it is written for a human, and printed into the transcript. */
export const CHECK_COMMAND = `node ${CHECK_ARGV.join(' ')}`;

const HEADER = [
  '# The screenplay format check, and what it printed.',
  '#',
  '# This file is output, not prose: it is the recorded stdout and exit status',
  `# of the command below, run against the screenplay as it stands on disk.`,
  '#',
  '#   rewrite:  npm run report --prefix script',
  '#   verify:   npm run check  --prefix script   (re-runs and diffs this file)',
  '#',
  '# The test suite verifies it too, so it cannot drift from the screenplay.',
];

/** Run the format check as its own process, from the repository root. */
export function runCheck(cwd = REPO) {
  const r = spawnSync(process.execPath, CHECK_ARGV, { cwd, encoding: 'utf8' });
  if (r.error) throw r.error;
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** Line endings differ by checkout (core.autocrlf); the transcript's do not. */
export function normalise(text) {
  return text.replace(/\r\n/g, '\n');
}

/**
 * Render a run as the transcript text. Pure: the same run always renders the
 * same bytes, so comparing a fresh run's rendering with the checked-in file is
 * a comparison of the two runs.
 */
export function renderTranscript({ stdout, stderr = '', status }) {
  const body = normalise(stdout).replace(/\n+$/, '');
  const parts = [...HEADER, '', `$ ${CHECK_COMMAND}`, body];
  const err = normalise(stderr).replace(/\n+$/, '');
  if (err) parts.push('', '# stderr', err);
  parts.push('', '$ echo $?', String(status), '');
  return parts.join('\n');
}

/** The transcript a fresh run of the check would produce right now. */
export function currentTranscript(cwd = REPO) {
  return renderTranscript(runCheck(cwd));
}

/**
 * The transcript as recorded in a file, or null if it is missing. Defaults to
 * the checked-in one; any path may be given, which is what lets the staleness
 * check be pointed at a copy.
 */
export function recordedTranscript(file = path.join(REPO, REPORT_PATH)) {
  return existsSync(file) ? normalise(readFileSync(file, 'utf8')) : null;
}

function main(argv) {
  const args = argv.slice(2);
  const write = args.includes('--write');
  const given = args.filter((a) => !a.startsWith('--'))[0];
  const file = path.resolve(REPO, given ?? REPORT_PATH);
  const shown = path.relative(REPO, file).split(path.sep).join('/');
  const fresh = currentTranscript();

  if (write) {
    writeFileSync(file, fresh);
    console.log(`wrote ${shown} from a live run of: ${CHECK_COMMAND}`);
    return 0;
  }

  const recorded = recordedTranscript(file);
  if (recorded === null) {
    console.error(`${shown} is missing; run: npm run report --prefix script`);
    return 1;
  }
  if (recorded !== fresh) {
    console.error(
      `${shown} is stale: it does not match a live run of ${CHECK_COMMAND}.\n` +
        'Re-record it with: npm run report --prefix script'
    );
    const a = recorded.split('\n');
    const b = fresh.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) {
        console.error(`  line ${i + 1}\n  recorded: ${JSON.stringify(a[i])}\n  live:     ${JSON.stringify(b[i])}`);
      }
    }
    return 1;
  }
  console.log(`${shown} matches a live run of: ${CHECK_COMMAND}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv);
}

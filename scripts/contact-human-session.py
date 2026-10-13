#!/usr/bin/env python3
"""Print the current short-lived private test URL only to the owner's terminal."""
import json
import os
from pathlib import Path
import re
import resource
import stat
import sys
import time


def main():
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    if sys.argv[1:] != ['--link'] or not sys.stdin.isatty() or not sys.stdout.isatty():
        raise ValueError()
    store = Path('/home/ubuntu/.config/neraium')
    info = store.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
        raise ValueError()
    source = store / 'contact-verification.json'
    info = source.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600:
        raise ValueError()
    session = json.loads(source.read_text())
    now = time.time() * 1000
    if (not re.fullmatch(r'https://neraium\.com/api/contact-verification#neraium-v1=[a-f0-9]{32}_[a-f0-9]{64}', session['url'])
            or not isinstance(session['link_expires_at'], (int, float))
            or not isinstance(session['expires_at'], (int, float))
            or now >= session['link_expires_at'] or session['link_expires_at'] > now + 1800000
            or now >= session['expires_at'] or session['expires_at'] > now + 2400000
            or session['link_expires_at'] > session['expires_at']):
        raise ValueError()
    sys.stdout.write(session['url'] + '\n')
    sys.stdout.flush()
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (Exception, KeyboardInterrupt):
        print('Private test link unavailable or expired; ask the operator to prepare a fresh session.')
        sys.exit(1)

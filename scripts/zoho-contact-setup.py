#!/usr/bin/env python3
"""Run from a private user terminal. Never pass credentials as arguments."""
import datetime
import getpass
import hashlib
import json
import os
from pathlib import Path
import resource
import stat
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import warnings

ROOT = Path(__file__).resolve().parent.parent
STORE = Path('/home/ubuntu/.config/neraium')
PRODUCTION = STORE / 'zoho-contact.json'
INSPECTION = STORE / 'zoho-contact-inspection.json'
VERIFIED = STORE / 'zoho-contact-verification.json'
DOMAINS = dict(us='zoho.com', eu='zoho.eu', **{'in': 'zoho.in'},
               au='zoho.com.au', jp='zoho.jp', ca='zohocloud.ca',
               sa='zoho.sa', uk='zoho.uk')


class SetupError(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise SetupError('Redirect refused; check the regional server.')


def request_json(url, body=None, token=None):
    headers = {'Accept': 'application/json'}
    if body is not None:
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        body = urllib.parse.urlencode(body).encode()
    if token:
        headers['Authorization'] = 'Zoho-oauthtoken ' + token
    req = urllib.request.Request(url, data=body, headers=headers)
    # No environment proxies, request debugging, redirects or provider-body logging.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    try:
        with opener.open(req, timeout=20) as response:
            value = json.loads(response.read(1048576))
    except (urllib.error.URLError, ValueError, TimeoutError):
        raise SetupError('Zoho request failed. No response payload was logged; no automatic retry.') from None
    if not isinstance(value, dict):
        raise SetupError('Unexpected Zoho response; payload suppressed.')
    return value


def check_private(path, directory=False):
    info = path.lstat()
    expected = stat.S_ISDIR if directory else stat.S_ISREG
    if not expected(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != (0o700 if directory else 0o600):
        raise SetupError('Credential storage must be owner-owned, nonsymlink, and mode 0700/0600.')


def load(path):
    if not path.exists() and not path.is_symlink():
        return None
    check_private(path)
    with path.open() as source:
        return json.load(source)


def save(path, value, replace=False):
    if path.exists() or path.is_symlink():
        check_private(path)
        if not replace:
            raise SetupError('Credential file already exists; preserving it. Do not generate another send grant.')
    fd, name = tempfile.mkstemp(prefix='.zoho-', dir=STORE)
    try:
        with os.fdopen(fd, 'w') as target:
            json.dump(value, target, indent=2)
            target.write('\n')
            target.flush()
            os.fsync(target.fileno())
        if replace:
            os.replace(name, path)
        else:
            os.link(name, path)  # Fail rather than overwrite concurrent/existing work.
    finally:
        if os.path.exists(name):
            os.unlink(name)


def secret(label):
    value = getpass.getpass(label + ': ').strip()
    if not value or any(c.isspace() for c in value):
        raise SetupError('Empty or invalid private input; nothing exchanged.')
    return value


def fingerprint(client_id):
    return hashlib.sha256(client_id.encode()).hexdigest()


def inspect(region, access, client_id):
    result = request_json('https://mail.' + DOMAINS[region] + '/api/accounts', token=access)
    if result.get('status', {}).get('code') != 200 or not isinstance(result.get('data'), list):
        raise SetupError('Account inspection failed. Use a separate ZohoMail.accounts.READ grant.')
    matches = []
    for account in result['data']:
        if not isinstance(account, dict):
            continue
        addresses = account.get('emailAddress', [])
        sender = [a for a in addresses if isinstance(a, dict) and a.get('mailId', '').lower() == 'website@neraium.com']
        sending = [a for a in account.get('sendMailDetails', []) if isinstance(a, dict) and a.get('fromAddress', '').lower() == 'website@neraium.com' and a.get('status') is True]
        mailbox = account.get('mailboxAddress', '').lower()
        if (mailbox in ('craig@neraium.com', 'website@neraium.com')
                and account.get('type') == 'ZOHO_ACCOUNT' and account.get('enabled') is True
                and account.get('mailboxStatus') == 'enabled' and account.get('outgoingBlocked') is False
                and sender and sender[0].get('isConfirmed') is True and sending
                and str(account.get('accountId', '')).isdigit()):
            matches.append((account, sender[0]))
    if len(matches) != 1:
        raise SetupError('Exactly one enabled Neraium mailbox with confirmed website sender and active sending entry was not verified. Review Zoho Mail settings; no mail sent.')
    account, sender = matches[0]
    evidence = {'ZOHO_ACCOUNT_ID': str(account['accountId']), 'ZOHO_DATA_CENTER': region,
                'client_fingerprint': fingerprint(client_id), 'mailbox': account['mailboxAddress'],
                'sender': 'website@neraium.com', 'is_alias': sender.get('isAlias') is True,
                'outgoing_allowed': True, 'verified_at': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    save(VERIFIED, evidence, replace=True)
    print('Verified Neraium mailbox and confirmed website@neraium.com sending entry; outgoing mail allowed.')
    print('Alias on mailbox: ' + str(evidence['is_alias']) + '; mailbox: ' + evidence['mailbox'])


def prepare():
    production, verified = load(PRODUCTION), load(VERIFIED)
    if not production or not verified:
        print('Worker preparation awaits both inspection and the separate send-only grant.')
        return
    if (production['ZOHO_DATA_CENTER'] != verified['ZOHO_DATA_CENTER']
            or fingerprint(production['ZOHO_CLIENT_ID']) != verified['client_fingerprint']):
        raise SetupError('Inspection and production client/region differ; Worker preparation held.')
    production['ZOHO_ACCOUNT_ID'] = verified['ZOHO_ACCOUNT_ID']
    save(PRODUCTION, production, replace=True)
    config = json.loads((ROOT / 'wrangler.jsonc').read_text())
    if (config['name'] != 'website' or config['account_id'] != '9820361c238dcdeef0b72b24ec3734db'
            or config['vars']['CONTACT_ENABLED'] != 'false'
            or config['vars']['CONTACT_RETENTION_APPROVED'] != 'false'
            or config['vars']['CONTACT_FROM'] != 'website@neraium.com'
            or config['vars']['CONTACT_TO'] != 'craig@neraium.com'):
        raise SetupError('Unexpected Worker configuration; preparation held.')
    config['vars']['ZOHO_DATA_CENTER'] = production['ZOHO_DATA_CENTER']
    for key in ('ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_ACCOUNT_ID'):
        if key not in config['secrets']['required']:
            config['secrets']['required'].append(key)
    draft = ROOT / '.planning/contact-activation/wrangler.zoho-prepared.jsonc'
    draft.write_text(json.dumps(config, indent=2) + '\n')
    # This is a review artifact. Its relative asset/main paths target the repository root.
    summary = {k: v for k, v in verified.items() if k != 'client_fingerprint'}
    summary.update(production_send_grant_saved=True, contact_enabled=False,
                   retention_approved=False, cloudflare_changed=False, mail_sent=False)
    (ROOT / '.planning/contact-activation/zoho-verification-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    print('Send-only credentials ready at /home/ubuntu/.config/neraium/zoho-contact.json (0600).')
    print('Prepared review configuration and sanitized verification summary under .planning/contact-activation/.')
    print('Cloudflare unchanged. Both flags remain false. No email sent.')


def main():
    os.umask(0o077)
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    warnings.simplefilter('error', getpass.GetPassWarning)
    if len(sys.argv) != 1 or not sys.stdin.isatty() or not sys.stdout.isatty():
        raise SetupError('Run without arguments in your private Ubuntu terminal; never through Codex or redirected input/output.')
    for parent in (STORE.parent, STORE):
        if parent.is_symlink():
            raise SetupError('Credential directory symlink refused.')
    STORE.mkdir(mode=0o700, parents=True, exist_ok=True)
    check_private(STORE, directory=True)
    print('Use only a Neraium-specific Self Client. Close terminal recording/session logging first.')
    if input('Confirm this is Neraium, not PPCLV, and terminal recording is off (yes): ').strip() != 'yes':
        return
    mode = input('Code scope: inspect = ZohoMail.accounts.READ; send = ZohoMail.messages.CREATE: ').strip()
    if mode not in ('inspect', 'send'):
        raise SetupError('Use only one exact scope per grant. Generate a fresh scoped code if needed.')
    server = input('Exact accounts server from your Zoho API Console (e.g. accounts.zoho.eu): ').strip().removeprefix('https://').rstrip('/')
    region = next((key for key, domain in DOMAINS.items() if server == 'accounts.' + domain), None)
    if region is None:
        raise SetupError('Unrecognized regional server; no credentials requested or sent.')
    print('Exchange endpoint: https://' + server + '/oauth/v2/token')
    target = PRODUCTION if mode == 'send' else INSPECTION
    if load(target):
        if mode == 'send':
            prepare()
            return
        credentials = load(target)
        if credentials['ZOHO_DATA_CENTER'] != region:
            raise SetupError('Saved inspection region differs; preserving credentials.')
        result = request_json('https://' + server + '/oauth/v2/token', {
            'grant_type': 'refresh_token', 'client_id': credentials['ZOHO_CLIENT_ID'],
            'client_secret': credentials['ZOHO_CLIENT_SECRET'], 'refresh_token': credentials['ZOHO_REFRESH_TOKEN']})
    else:
        client_id = secret('Neraium client ID (hidden)')
        client_secret = secret('Neraium client secret (hidden)')
        code = secret('Fresh authorization code (hidden)')
        result = request_json('https://' + server + '/oauth/v2/token', {
            'grant_type': 'authorization_code', 'client_id': client_id,
            'client_secret': client_secret, 'code': code})
        if result.get('error') or not result.get('access_token') or not result.get('refresh_token'):
            raise SetupError('Exchange did not return both tokens. Payload suppressed; check code expiry, scope and client region. No automatic retry.')
        credentials = {'ZOHO_CLIENT_ID': client_id, 'ZOHO_CLIENT_SECRET': client_secret,
                       'ZOHO_REFRESH_TOKEN': result['refresh_token'], 'ZOHO_DATA_CENTER': region}
        save(target, credentials)
        print('Refresh token saved privately; authorization code and access token are not persisted.')
    if mode == 'inspect':
        if not result.get('access_token') or result.get('error'):
            raise SetupError('Inspection authorization unavailable; payload suppressed.')
        inspect(region, result['access_token'], credentials['ZOHO_CLIENT_ID'])
    prepare()


if __name__ == '__main__':
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print('\nStopped; no private input printed.')
        sys.exit(1)
    except SetupError as error:
        print(str(error))
        sys.exit(1)
    except Exception:
        # Never print exception repr/traceback: network and JSON exceptions can contain secrets.
        print('Setup stopped safely; details suppressed. Existing credentials preserved.')
        sys.exit(1)

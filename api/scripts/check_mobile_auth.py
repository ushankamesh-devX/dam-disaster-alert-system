"""Local-only auth/onboarding smoke test. Creates and soft-deletes two QA accounts."""
import json
import secrets
import urllib.request
import urllib.error
import uuid

BASE = 'http://localhost:8080/api/v1'
accounts = []
def call(method, route, body=None, token=None, expected=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(BASE + route, data=json.dumps(body).encode() if body is not None else None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            status, payload = response.status, json.load(response)
    except urllib.error.HTTPError as error:
        status, payload = error.code, json.load(error)
    assert status == expected, (route, status, expected)
    return payload.get('data', payload) if isinstance(payload, dict) else payload

try:
    for index in range(2):
        credentials = {'fullName': 'Mobile QA ' + str(index), 'email': 'mobile-qa-' + uuid.uuid4().hex + '@example.invalid', 'password': secrets.token_urlsafe(20)}
        result = call('POST', '/auth/register', credentials, expected=201)
        accounts.append((credentials, result['token']))
        assert result['user']['preferredDamId'] is None
        assert result['user']['onboardingCompletedAt'] is None
    credentials, token = accounts[0]
    dams = call('GET', '/dams/active', token=token)
    selected = next(dam for dam in dams if dam['code'] != 'DEMO-002')
    call('PUT', '/users/me', {'preferredDamId': 999999999}, token, expected=404)
    assert call('GET', '/users/me', token=token)['preferredDamId'] is None
    updated = call('PUT', '/users/me', {'preferredDamId': selected['id'], 'languagePreference': 'en'}, token)
    assert updated['preferredDamId'] == selected['id'] and updated['onboardingCompletedAt']
    assert updated['lastKnownLatitude'] is None and updated['lastKnownLongitude'] is None
    # Read persisted time at database precision before comparing later sessions.
    stored = call('GET', '/users/me', token=token)
    signed_in = call('POST', '/auth/login', {'email': credentials['email'], 'password': credentials['password']})
    assert signed_in['user']['preferredDamId'] == selected['id']
    assert signed_in['user']['onboardingCompletedAt'] == stored['onboardingCompletedAt']
    assert call('GET', '/users/me', token=accounts[1][1])['preferredDamId'] is None
    call('POST', '/auth/login', {'email': credentials['email'], 'password': 'incorrect'}, expected=401)
    print('PASS: registration, personal sessions, dam preference, relogin persistence, account isolation, invalid dam rejection, incorrect password, and untouched location fields')
finally:
    for _, token in accounts:
        call('DELETE', '/users/me', token=token)
    print('Local QA accounts deactivated')

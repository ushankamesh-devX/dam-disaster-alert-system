"""Tiny HTTP runner so admins can start / stop / reset the evacuation scenario from the web page.

Runs inside the ddas-scenario pod (k8s/scenario.yaml) next to the scripts; only the API calls it.
    GET  /status                                     -> {running, action, startedAt, options, recorded, exitCode, log}
    POST /start  {dams: [..], minutes, people}       -> runs evacuation_scenario.py
    POST /stop                                       -> stops the running scenario
    POST /reset                                      -> runs evacuation_scenario.py --reset
One job at a time. Standard library only.
"""
import json
import os
import signal
import subprocess
import sys
import threading
from collections import deque
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / 'evacuation_scenario.py'
STATE = Path.home() / '.ddas-scenario.json'
API_URL = os.environ.get('DDAS_API_URL', 'http://api:8080')
DAMS = ('kotmale', 'victoria', 'randenigala')

lock = threading.Lock()
job = {'proc': None, 'action': None, 'startedAt': None, 'options': None, 'exitCode': None}
lines = deque(maxlen=200)


def recorded():
    """A scenario's data is still in the database (start needs a reset first)."""
    try:
        return bool(json.loads(STATE.read_text()).get('dam_id'))
    except (OSError, ValueError):
        return False


def status():
    proc = job['proc']
    return {'running': proc is not None and proc.poll() is None, 'action': job['action'],
            'startedAt': job['startedAt'], 'options': job['options'], 'exitCode': job['exitCode'],
            'recorded': recorded(), 'log': list(lines)[-60:]}


def launch(action, args, options=None):
    with lock:
        if job['proc'] is not None and job['proc'].poll() is None:
            raise ValueError(f'The {job["action"]} is still running. Stop it first.')
        lines.clear()
        lines.append(f'{datetime.now():%H:%M:%S} {action}: {" ".join(args) or "(defaults)"}')
        proc = subprocess.Popen([sys.executable, '-u', str(SCRIPT), '--url', API_URL, *args], cwd=HERE,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        job.update(proc=proc, action=action, startedAt=datetime.now().isoformat(timespec='seconds'),
                   options=options, exitCode=None)

    def pump():
        for line in proc.stdout:
            lines.append(line.rstrip())
        job['exitCode'] = proc.wait()
        lines.append(f'{datetime.now():%H:%M:%S} {action} finished (exit {job["exitCode"]})')

    threading.Thread(target=pump, daemon=True).start()


def start(body):
    dams = [d for d in body.get('dams') or ['victoria'] if d in DAMS]
    if not dams:
        raise ValueError('Choose at least one dam.')
    if recorded():
        raise ValueError('An earlier scenario is still in the database. Reset first.')
    minutes = min(30.0, max(2.0, float(body.get('minutes') or 10)))
    people = min(200, max(10, int(body.get('people') or 80)))
    launch('scenario', ['--dam', ','.join(dams), '--minutes', f'{minutes:g}', '--people', str(people)],
           {'dams': dams, 'minutes': minutes, 'people': people})


def stop():
    proc = job['proc']
    if proc is None or proc.poll() is not None:
        raise ValueError('Nothing is running.')
    proc.send_signal(signal.SIGINT)   # Ctrl+C; the scenario data stays until Reset
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()
    lines.append(f'{datetime.now():%H:%M:%S} Stopped by admin. Press Reset to remove the scenario data.')


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/status':
            self.reply(200, status())
        else:
            self.reply(404, {'message': 'Not found'})

    def do_POST(self):
        try:
            size = int(self.headers.get('Content-Length') or 0)
            body = json.loads(self.rfile.read(size) or b'{}') if size else {}
            if self.path == '/start':
                start(body)
            elif self.path == '/stop':
                stop()
            elif self.path == '/reset':
                launch('reset', ['--reset'])
            else:
                return self.reply(404, {'message': 'Not found'})
            self.reply(200, status())
        except (ValueError, TypeError) as e:
            self.reply(409, {'message': str(e)})

    def log_message(self, *args):
        pass   # keep the pod log for the scenario output


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8090'))
    print(f'Scenario runner on :{port}, API {API_URL}', flush=True)
    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()

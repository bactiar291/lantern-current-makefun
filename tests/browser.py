import argparse
import functools
import http.server
import json
import os
from pathlib import Path
import threading

from typing import Any
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description='Real-control voyage and native keyboard regression checks')
parser.add_argument('--artifacts-dir', type=Path, default=ROOT / 'browser-artifacts')
parser.add_argument('--no-capture', action='store_true', help='Verify behavior without writing screenshots')
args = parser.parse_args()
ARTIFACTS = args.artifacts_dir.resolve()
ARTIFACTS.mkdir(parents=True, exist_ok=True)
(ARTIFACTS / 'runtime').mkdir(exist_ok=True)
os.environ['TMPDIR'] = str(ARTIFACTS / 'runtime')
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT / 'game')))
threading.Thread(target=server.serve_forever, daemon=True).start()
report: dict[str, Any] = {'capture_enabled': not args.no_capture, 'screenshots': [], 'errors': [], 'external_requests': [], 'assertions': [], 'journey': []}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/snap/bin/chromium', headless=True, args=['--no-sandbox'], downloads_path=str(ARTIFACTS/'downloads'))
        page = browser.new_page(viewport={'width': 1280, 'height': 800}, device_scale_factor=1)
        page.on('pageerror', lambda error: report['errors'].append(str(error)))
        page.on('console', lambda msg: report['errors'].append(msg.text) if msg.type == 'error' else None)
        page.on('request', lambda req: report['external_requests'].append(req.url) if not req.url.startswith(('http://127.0.0.1:', 'data:')) else None)
        page.clock.install(time=0)
        page.goto(f'http://127.0.0.1:{server.server_port}/')
        page.wait_for_function('typeof window.lanternState === "function"')
        page.clock.pause_at(1000)
        def state():
            return page.evaluate('window.lanternState()')
        def advance(ms):
            page.clock.run_for(ms)
        def capture(name):
            if args.no_capture:
                return
            before = state()
            target = ARTIFACTS / 'screenshots' / name
            target.parent.mkdir(exist_ok=True)
            page.screenshot(path=str(target), type='jpeg', quality=86, animations='disabled')
            after = state()
            from PIL import Image
            width, height = Image.open(target).size
            assert before == after, f'Screenshot state changed: {name}'
            assert target.stat().st_size <= 262144
            assert max(width, height) <= 1280 and min(width, height) >= 480
            report['screenshots'].append({'path': str(target), 'width': width, 'height': height, 'bytes': target.stat().st_size, 'pre_state': before, 'post_state': after})
        held = set()
        def keys(wanted):

            for key in held - set(wanted): page.keyboard.up(key)
            for key in set(wanted) - held: page.keyboard.down(key)
            held.clear()
            held.update(wanted)
        def sail(x, y):
            for _ in range(350):
                s = state()
                assert s['mode'] == 'play', s
                dx, dy = x-s['boat']['x'], y-s['boat']['y']
                if (dx*dx+dy*dy)**.5 < 12:
                    keys(['Space']); advance(250); keys([])
                    return
                wanted = []
                if abs(dx)>6: wanted.append('ArrowRight' if dx>0 else 'ArrowLeft')
                if abs(dy)>6: wanted.append('ArrowDown' if dy>0 else 'ArrowUp')
                keys(wanted); advance(100)
            raise AssertionError(f'Could not reach {x},{y}: {state()}')
        def route(points):
            for x,y in points: sail(x,y)
        def dock():
            keys(['Space']); advance(1000); keys([])
        def pickup(index, points=()):
            route(points)
            k=state()['keepers'][index]
            sail(k['x'],k['y']+10); dock()
            assert index in state()['cargo'], state()
            report['journey'].append({'event':'rescue','stage':state()['stage'],'keeper':index,'ticks':state()['ticks']})
        def home(points=()):
            route(points); sail(108,290); dock()
            assert not state()['cargo']
            report['journey'].append({'event':'delivery','state':state()})
        assert state()['mode']=='title'
        capture('2-start.jpg')
        def focused(identifier):
            return page.locator(f'#{identifier}').evaluate('(element) => element === document.activeElement')
        def tab_to(identifier):
            order = ['sound', 'pause', 'river', 'primary']
            for _ in range(8):
                if focused(identifier): return
                current = next((i for i, name in enumerate(order) if focused(name)), -1)
                page.keyboard.press('Shift+Tab' if current > order.index(identifier) else 'Tab')
            raise AssertionError(f'Tab could not reach {identifier}')
        def check(name):
            report['assertions'].append(name)
        assert focused('primary')
        page.keyboard.press('Enter'); advance(100)
        assert state()['mode']=='play' and focused('river')
        check('keyboard-only Enter start focuses gameplay canvas')
        start_x=state()['boat']['x']
        keys(['ArrowRight']);advance(500);keys([])
        assert state()['boat']['x']>start_x+20
        check('real-key movement after start')
        page.keyboard.press('p'); advance(100)
        paused=state(); advance(1000); assert state()==paused
        assert focused('primary')
        check('P pauses, focuses menu and freezes simulation')
        tab_to('sound')
        for activation in ['Space', 'Enter']:
            was_on=page.locator('#sound').get_attribute('aria-pressed')
            page.keyboard.press(activation); advance(100)
            assert page.locator('#sound').get_attribute('aria-pressed') != was_on
            assert state()==paused, 'Mute must not resume or advance a paused game'
            check(f'paused sound button native {activation} toggles only mute')
        tab_to('pause'); page.keyboard.press('Enter')
        assert state()['mode']=='play' and focused('river')
        check('focused Resume button Enter resumes exactly once')
        tab_to('pause'); page.keyboard.press('Space')
        assert state()['mode']=='paused'
        tab_to('pause'); page.keyboard.press('Space')
        assert state()['mode']=='play' and focused('river')
        check('pause button native Space pauses and resumes')
        tab_to('pause'); page.keyboard.press('Enter')
        assert state()['mode']=='paused'
        page.keyboard.press('Space')
        assert state()['mode']=='play' and focused('river')
        check('pause button Enter and primary Space resume')
        tab_to('sound')
        playing=state()
        for activation in ['Space', 'Enter']:
            was_on=page.locator('#sound').get_attribute('aria-pressed')
            page.keyboard.press(activation)
            assert page.locator('#sound').get_attribute('aria-pressed') != was_on
            assert state()==playing, 'Mute must not restart, pause, or anchor the skiff'
        check('playing sound button native Space/Enter changes only mute')
        tab_to('river'); page.keyboard.press('m')
        assert page.locator('#sound').get_attribute('aria-pressed')=='false'
        page.keyboard.press('m')
        assert page.locator('#sound').get_attribute('aria-pressed')=='true'
        check('canvas M shortcut toggles mute')
        page.keyboard.press('p')
        page.get_by_role('button',name='Resume voyage').click()
        assert focused('river')
        check('mouse resume restores gameplay focus')
        pickup(0,[(210,160)])
        sail(500,155)
        capture('1-play.jpg')
        pickup(1,[(680,160),(700,410)])
        home([(660,430),(190,430)])
        assert state()['mode']=='between' and state()['totalSaved']==2
        assert focused('primary')
        page.keyboard.press('Space')
        assert state()['stage']==1 and state()['mode']=='play' and focused('river')
        check('native Space opens next chart')
        pickup(0,[(210,145)])
        pickup(1,[(570,130),(750,150)])
        sail(590,130)
        # The third frame is reserved for the live boss encounter.
        home([(570,130),(180,145)])
        pickup(2,[(190,490),(745,490)])
        home([(745,490),(190,490)])
        assert state()['mode']=='between'
        assert focused('primary')
        page.keyboard.press('Enter')
        assert state()['stage']==2 and state()['mode']=='play' and focused('river')
        check('native Enter opens next chart')
        pickup(0,[(200,140)])
        pickup(1,[(570,130),(765,140)])
        home([(570,130),(190,140)])
        pickup(3,[(190,490),(350,490)])
        pickup(2,[(600,490),(815,490)])
        home([(600,490),(190,490)])
        assert state()['mode']=='bossIntro' and state()['totalSaved']==9
        page.keyboard.press('Enter'); advance(100)
        assert state()['mode']=='boss' and focused('river')
        check('real controls enter the Bell-Maw encounter')
        boss_captured = False
        for _ in range(400):
            s=state()
            if s['mode'] != 'boss': break
            if not boss_captured and s['boat']['x'] > 540 and s['boss']['phase'] == 'recover':
                capture('3-depth.jpg'); boss_captured = True
            if s['boss']['phase'] == 'recover' and not s['boss']['sealHit'] and s['boat']['x'] > 540 and s['flareCooldown'] == 0 and not s['flareShot']:
                keys(['f']); advance(50); keys([])
            else:
                target_y = 100 if s['boss']['laneY'] > 275 else 450
                wanted=['ArrowUp'] if s['boat']['y'] > target_y + 10 else ['ArrowDown'] if s['boat']['y'] < target_y - 10 else []
                if s['boat']['x'] < 600: wanted.append('ArrowRight')
                elif s['boat']['x'] > 640: wanted.append('ArrowLeft')
                keys(wanted)
            advance(100)
        keys([])
        assert state()['mode']=='won' and state()['totalSaved']==9, state()
        capture('4-end.jpg')
        assert focused('primary')
        page.keyboard.press('Space'); advance(100)
        assert state()['mode']=='play' and state()['score']==0 and state()['stage']==0
        assert focused('river')
        check('native Space restarts after legitimate nine-keeper win')
        # Lose through elapsed gameplay time, then verify the loss menu as well.
        keys(['Space'])
        for _ in range(111): advance(1000)
        keys([])
        assert state()['mode']=='lost' and focused('primary')
        page.keyboard.press('Enter')
        assert state()['mode']=='play' and state()['score']==0 and focused('river')
        check('natural storm loss and native Enter restart')
        page.keyboard.press('p')
        assert state()['mode']=='paused'
        page.keyboard.press('p')
        assert state()['mode']=='play' and focused('river')
        check('P resumes from focused pause-menu button')
        page.keyboard.press('p')
        page.get_by_role('button',name='Resume voyage').click()
        page.get_by_role('button',name='Sound on').click()
        assert page.get_by_role('button',name='Sound off').get_attribute('aria-pressed')=='false'
        check('mouse resume and mute')
        page.reload(); advance(100)
        assert state()['mode']=='title'
        page.get_by_role('button',name='Cast off').click()
        assert state()['mode']=='play' and focused('river')
        start_x=state()['boat']['x']
        keys(['ArrowRight']); advance(500); keys([])
        assert state()['boat']['x']>start_x+20
        check('mouse start restores focus and real-key steering')
        # Only read detached diagnostics here; snapshot isolation is unit-tested.
        assert not report['errors'], report['errors']
        assert not report['external_requests'], report['external_requests']
        assert len([e for e in report['journey'] if e['event']=='rescue'])==9
        assert len([e for e in report['journey'] if e['event']=='delivery'])==5
        check('nine rescues, five deliveries, three charts and legitimate win')
        check('zero console/page errors and external requests')
        assert len(report['screenshots'])==(0 if args.no_capture else 4)
        check('no images written' if args.no_capture else 'four bounded raw JPEG captures with identical pre/post states')
        report['assertion_count']=len(report['assertions'])
        report['success']=True
        browser.close()
except Exception as error:
    report['success']=False
    report['failure']=str(error)
    raise
finally:
    server.shutdown(); server.server_close()
    (ARTIFACTS/'browser-report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps({'success':report.get('success'),'screenshots':len(report['screenshots']),'errors':report['errors'],'failure':report.get('failure')}))

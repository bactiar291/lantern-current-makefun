import argparse
import functools
import http.server
import json
import os
from pathlib import Path
import threading
import subprocess
import hashlib
import fcntl

verification_lock = open('/tmp/makefun/campaign-20261117/verification.lock', 'a')
fcntl.flock(verification_lock, fcntl.LOCK_EX)

from typing import Any
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
# Read the owned route literal through Node; it is test data, never browser state.
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
        page.add_init_script('''(() => {
          const Native=window.AudioContext;
          window.audioEvidence={contexts:[],created:0,disconnected:0};
          window.AudioContext=class extends Native {
            constructor(...args){super(...args);window.audioEvidence.contexts.push(this);}
            createOscillator(){const n=super.createOscillator(),disconnect=n.disconnect.bind(n);window.audioEvidence.created++;let released=false;n.disconnect=(...args)=>{if(!released){window.audioEvidence.disconnected++;released=true;}return disconnect(...args);};return n;}
          };
        })()''')
        page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(f'http://127.0.0.1:{server.server_port}/') else route.abort())
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
            canvas_before=page.locator('#river').evaluate('(c)=>c.toDataURL()')
            geometry=page.evaluate('''() => [...document.querySelectorAll('#river,aside,#signal-note,footer,#panel,#chart-selector button')].filter(e=>e.getClientRects().length && getComputedStyle(e).visibility!=='hidden').map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.tagName,x:r.x,y:r.y,width:r.width,height:r.height}})''')
            for box in geometry:
                assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=1280.5 and box['y']+box['height']<=800.5,box
            target = ARTIFACTS / 'screenshots' / name
            target.parent.mkdir(exist_ok=True)
            page.screenshot(path=str(target), type='jpeg', quality=86, animations='disabled')
            after = state()
            canvas_after=page.locator('#river').evaluate('(c)=>c.toDataURL()')
            assert canvas_before==canvas_after, f'Canvas scene changed during capture: {name}'
            from PIL import Image
            width, height = Image.open(target).size
            assert before == after, f'Screenshot state changed: {name}'
            assert target.stat().st_size <= 262144
            assert max(width, height) <= 1280 and min(width, height) >= 480
            report['screenshots'].append({'path': str(target), 'width': width, 'height': height, 'bytes': target.stat().st_size, 'sha256':hashlib.sha256(target.read_bytes()).hexdigest(), 'canvas_before_sha256':hashlib.sha256(canvas_before.encode()).hexdigest(),'canvas_after_sha256':hashlib.sha256(canvas_after.encode()).hexdigest(),'geometry':geometry,'pre_state': before, 'post_state': after})
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
        assert page.locator('#replay-1').is_disabled() and page.locator('#replay-2').is_disabled()
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
        audio_status=page.evaluate('({created:audioEvidence.created,disconnected:audioEvidence.disconnected,states:audioEvidence.contexts.map(c=>c.state)})')
        assert audio_status['created']>0 and audio_status['created']==audio_status['disconnected'],audio_status
        assert all(s=='suspended' for s in audio_status['states']),audio_status
        report['audio_pause']=audio_status
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
        audio_status=page.evaluate('({created:audioEvidence.created,disconnected:audioEvidence.disconnected,states:audioEvidence.contexts.map(c=>c.state)})')
        assert audio_status['created']==audio_status['disconnected'],audio_status
        report['audio_mute']=audio_status
        page.keyboard.press('m')
        assert page.locator('#sound').get_attribute('aria-pressed')=='true'
        check('canvas M shortcut toggles mute')
        page.keyboard.press('p')
        page.get_by_role('button',name='Resume voyage').click()
        assert focused('river')
        check('mouse resume restores gameplay focus')
        pickup(0,[(210,160)])
        sail(500,155)

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
        assert 'tide' in page.locator('#tide').inner_text()

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
        assert state()['mode']=='won' and state()['totalSaved']==9

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
        earned = [page.locator(f'#replay-{i}').inner_text() for i in range(3)]
        assert all('Complete' in text and 'Best' in text for text in earned)
        assert all(page.locator(f'#replay-{i}').is_enabled() for i in range(3))

        page.locator('#replay-1').click()
        assert state()['replay'] and state()['stage']==1 and state()['score']==0 and state()['cargo']==[]
        page.keyboard.press('p'); frozen=state(); advance(13000); assert state()==frozen
        page.keyboard.press('p')
        pickup(0,[(210,145)])
        pickup(1,[(570,130),(750,150)])
        home([(570,130),(180,145)])
        pickup(2,[(190,490),(745,490)])
        home([(745,490),(190,490)])
        assert state()['mode']=='replayed' and state()['totalSaved']==3
        assert 'Single-chart replay complete' in page.locator('#panel-copy').inner_text()
        page.get_by_role('button',name='Start full voyage').click()
        assert state()['stage']==0 and not state()['replay'] and state()['score']==0 and state()['cargo']==[]
        check('earned logbook restored; mouse replay completes only one chart; pause freezes tide; full voyage resets')
        page.reload(); advance(100)
        page.locator('#replay-2').focus(); page.keyboard.press('Enter')
        assert state()['stage']==2 and state()['replay'] and focused('river')
        check('unlocked chart replay supports native keyboard activation')
        page.reload(); advance(100)
        page.get_by_role('button',name='Cast off').click()
        assert state()['mode']=='play' and focused('river')
        start_x=state()['boat']['x']
        keys(['ArrowRight']); advance(500); keys([])
        assert state()['boat']['x']>start_x+20
        check('mouse start restores focus and real-key steering')
        # Only read detached diagnostics here; snapshot isolation is unit-tested.
        assert not report['errors'], report['errors']
        assert not report['external_requests'], report['external_requests']
        assert len([e for e in report['journey'] if e['event']=='rescue'])==12
        assert len([e for e in report['journey'] if e['event']=='delivery'])==7
        check('nine rescues, five deliveries, three charts and legitimate win')
        page.reload(); advance(100)
        assert page.locator('#atlas').is_enabled()
        page.locator('#atlas').focus(); page.keyboard.press('Enter')
        assert state()['stage']==3 and not state()['replay'] and state()['score']==0
        chart_routes = json.loads(subprocess.check_output(['/tmp/makefun/runtime/node-v22.23.5-linux-x64/bin/node', str(ROOT/'tests'/'export-routes.js')], text=True))
        for chart_index, chart_route in enumerate(chart_routes, 3):
            assert state()['stage']==chart_index
            page.keyboard.press('p'); frozen=state();advance(21000);assert state()==frozen
            page.keyboard.press('p')
            for action_index, (kind,index,points) in enumerate(chart_route):
                if kind=='pickup': pickup(index,points)
                elif kind=='home': home(points)
                else:
                    route(points)
                    beacon = page.evaluate('async i => (await import("./stages.js")).STAGES[window.lanternState().stage].beacons[i]',index)
                    sail(beacon['x'],beacon['y']);keys(['Space']);advance(1500);keys([])
                    assert index in state()['litBeacons'],state()
                    report['journey'].append({'event':'beacon','state':state()})
                if chart_index==3 and action_index==3:
                    # Actual travel to a clear viewpoint; wait anchored for a visible moving log.
                    sail(900,320);keys(['Space'])
                    active=False
                    for _ in range(200):
                        active=page.evaluate('async () => {const h=await import("./hazards.js"),c=await import("./stages.js"),s=window.lanternState();return h.hazardsAt(c.STAGES[s.stage],s.elapsed).some(x=>x.solid)}')
                        if active:break
                        advance(100)
                    assert active
                    capture('1-play.jpg');keys([])
                if chart_index==5 and action_index==1:
                    capture('3-depth.jpg')
            assert state()['medal']>=1 and state()['remaining']>20
            report.setdefault('atlas_results',[]).append(state())
            if chart_index<5:page.locator('#primary').click()
        assert state()['mode']=='won' and state()['totalSaved']==12
        assert 'STORM ATLAS COMPLETE' in page.locator('#panel-kicker').inner_text()
        capture('4-end.jpg')
        page.locator('#primary').click();assert state()['score']==0 and state()['cargo']==[]
        page.reload();advance(100)
        for i in range(6):
            assert page.locator(f'#replay-{i}').is_enabled()
            assert 'Complete' in page.locator(f'#replay-{i}').inner_text()
        for i in range(3,6):assert 'signal' in page.locator(f'#replay-{i}').inner_text()
        capture('2-start.jpg')
        page.locator('#replay-5').focus();page.keyboard.press('Space')
        assert state()['stage']==5 and state()['replay'] and state()['litBeacons']==[]
        page.reload();advance(100)
        page.locator('#reset-logbook').click();assert page.locator('#replay-5').is_enabled()
        page.locator('#reset-logbook').click();assert page.locator('#replay-1').is_disabled() and page.locator('#atlas').is_disabled()
        page.reload();advance(100);assert page.locator('#replay-5').is_disabled()
        check('real-input Storm Atlas: 12 rescues, six lit beacons, three earned medals, victory and restart')
        check('Atlas hazard/tide pause, earned reload, keyboard replay, confirmed reset persistence')
        assert not report['errors'] and not report['external_requests']
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

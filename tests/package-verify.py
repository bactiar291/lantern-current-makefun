from pathlib import Path
import fcntl
import hashlib
import json
import os
import shutil
import subprocess

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT.parent/'artifacts'
NODE='/tmp/makefun/runtime/node-v22.23.5-linux-x64/bin/node'
lock=open('/tmp/makefun/campaign-20261117/verification.lock','a')
fcntl.flock(lock,fcntl.LOCK_EX)
report_path=ART/'atlas-final/browser-report.json'
browser=json.loads(report_path.read_text())
assert browser['success'] and len(browser['screenshots'])==4
assert not browser['errors'] and not browser['external_requests']
expected_vendor='dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129'
assert hashlib.sha256((ROOT/'vendor/makefun-game.ts').read_bytes()).hexdigest()==expected_vendor
for capture in browser['screenshots']:
    assert capture['pre_state']==capture['post_state']
    assert capture['canvas_before_sha256']==capture['canvas_after_sha256']
    source=Path(capture['path'])
    assert hashlib.sha256(source.read_bytes()).hexdigest()==capture['sha256']
    assert source.stat().st_size<=262144
    shutil.copyfile(source,ROOT/'screenshots'/source.name)
outputs=[]
for name in ['package-a','package-b']:
    output=ART/name
    assert not output.exists(), f'Refusing to merge stale output: {output}'
    env=os.environ.copy();env['MAKEFUN_OUTPUT_DIR']=str(output)
    result=subprocess.run([NODE,str(ROOT/'main.ts')],cwd=ROOT,env=env,text=True,capture_output=True)
    assert result.returncode==0,result.stderr
    outputs.append({'path':str(output),'stdout':result.stdout,'stderr':result.stderr})
def manifest(root):
    return {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
a,b=manifest(ART/'package-a'),manifest(ART/'package-b')
assert a==b
for name in a:assert (ART/'package-a'/name).read_bytes()==(ART/'package-b'/name).read_bytes()
assert (ART/'package-a/dossier.json').stat().st_size<=1572864
files=list((ROOT/'game').rglob('*'))
assert all(not p.is_symlink() for p in files)
assert len(files)<=993
assert sum(p.stat().st_size for p in files if p.is_file())<=50331648
result={'success':True,'outputs':outputs,'manifest':a,'file_count':len(a),'byte_identical':True,'vendor_sha256':expected_vendor,'dossier_bytes':(ART/'package-a/dossier.json').stat().st_size,'screenshots_copied':[str(ROOT/'screenshots'/Path(s['path']).name) for s in browser['screenshots']]}
(ART/'packaging-report.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))

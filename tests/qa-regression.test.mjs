import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { priorityRun } from '../src/protocols/protocol-engine.mjs';

test('older emergency stays active until handoff, including after reported resolution', () => {
  const older = { id:'A', kind:'chest', answers:{}, status:'resolved' };
  // Use a real question from the selected protocol.
  const urgent = { id:'B', kind:'chest', answers:{} };
  const closed = { id:'C', kind:'muscle', answers:{}, status:'resolved' };
  return import('../src/protocols/protocol-engine.mjs').then(({PROTOCOLS}) => {
    older.answers[PROTOCOLS.chest.questions[0].id]='yes';
    assert.equal(priorityRun([closed, urgent, older]).id,'A');
    assert.equal(priorityRun([closed, urgent, {...older,status:'handed-off'}]).id,'B');
  });
});

test('invalid chat request returns 400 and the same server keeps serving Health', {timeout:10000}, async t => {
  const proc=spawn(process.execPath,['server.cjs'],{cwd:new URL('../',import.meta.url), env:{...process.env,PORT:'0'},windowsHide:true});
  t.after(()=>proc.kill());
  const [message]=await once(proc.stdout,'data');
  const port=String(message).match(/localhost:(\d+)/)[1], base='http://127.0.0.1:'+port;
  const response=await fetch(base+'/api/ollama/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(null)});
  assert.equal(response.status,400);
  assert.equal((await fetch(base+'/health.html')).status,200);
  assert.equal((await fetch(base+'/server.cjs')).status,404);
  assert.equal((await fetch(base+'/.git/config')).status,404);
  assert.equal((await fetch(base+'/api/ollama/models',{headers:{Origin:'http://example.com'}})).status,403);
  const oversizedContext=await fetch(base+'/api/ollama/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'local:latest',messages:[{role:'user',content:'hi'}],options:{num_ctx:99999}})});
  assert.equal(oversizedContext.status,400);
});

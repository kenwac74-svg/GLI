import test from 'node:test';
import assert from 'node:assert/strict';
import { localAuthPreviewAllowed, authPreviewProvider, authPreviewIdentity } from '../lib/auth-preview.ts';

test('developer and staff preview identities are separate; staff sessions do not share an account',()=>{
  const developer=authPreviewIdentity('local-developer-v1');
  const one=authPreviewIdentity('local-staff-11111111-1111-4111-8111-111111111111');
  const two=authPreviewIdentity('local-staff-22222222-2222-4222-8222-222222222222');
  assert.notEqual(developer.email,one.email);
  assert.notEqual(one.email,two.email);
  assert.equal(authPreviewIdentity('admin'),null);
});

test('login preview requires the explicit local binding, development stage and loopback request host',()=>{
  const env={LOCAL_AUTH_PREVIEW_ENABLED:'true',DEPLOYMENT_STAGE:'development'};
  for(const host of ['localhost:8776','127.0.0.1:8776','[::1]:8776'])assert.equal(localAuthPreviewAllowed(host,env),true);
  for(const host of ['glibiz.net','localhost.evil.test','evil.test@localhost',''])assert.equal(localAuthPreviewAllowed(host,env),false);
  assert.equal(localAuthPreviewAllowed('localhost',{...env,LOCAL_AUTH_PREVIEW_ENABLED:undefined}),false);
  assert.equal(localAuthPreviewAllowed('localhost',{...env,DEPLOYMENT_STAGE:'production'}),false);
  assert.equal(localAuthPreviewAllowed('localhost',{...env,DEPLOYMENT_STAGE:'demo'}),false);
});
test('mock providers cannot select an admin role or arbitrary identity',()=>{
  assert.equal(authPreviewProvider('google'),'google');
  assert.equal(authPreviewProvider('chatgpt'),'chatgpt');
  assert.equal(authPreviewProvider('admin'),null);
  assert.equal(authPreviewProvider(null),null);
});

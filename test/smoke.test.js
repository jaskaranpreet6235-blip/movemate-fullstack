const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('frontend submits quote requests to the backend API', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  assert.match(html, /fetch\('\/api\/quotes'/);
  assert.doesNotMatch(html, /Fake quote form submit/);
});

test('server exposes quote creation and admin routes', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8');
  assert.match(server, /app\.post\('\/api\/quotes'/);
  assert.match(server, /app\.get\('\/api\/admin\/quotes'/);
  assert.match(server, /app\.patch\('\/api\/admin\/quotes\/:id'/);
  assert.match(server, /authorization/);
});

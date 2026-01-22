import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/ws?clientId=cli-test');

ws.on('open', () => {
  console.log('connected');
});

ws.on('message', (data) => {
  console.log('aaa', data.toString());
});

ws.on('close', (code, reason) => {
  console.log('closed', code, reason.toString());
});

ws.on('error', (err) => {
  console.error('error', err);
});

"""Loopback-only export receiver for the recording fixture. One fixed local output."""
from http.server import BaseHTTPRequestHandler,HTTPServer
from pathlib import Path
TARGET=Path(__file__).resolve().parents[1]/'docs/marketing/captures/narrated/gameplay-source.webm'
class Receiver(BaseHTTPRequestHandler):
 def do_OPTIONS(self):
  self.send_response(204);self.send_header('Access-Control-Allow-Origin','http://127.0.0.1:5178');self.send_header('Access-Control-Allow-Methods','POST');self.send_header('Access-Control-Allow-Headers','Content-Type');self.end_headers()
 def do_POST(self):
  n=int(self.headers.get('Content-Length','0'))
  if self.path!='/capture' or self.headers.get('Origin')!='http://127.0.0.1:5178' or not 0<n<100_000_000:self.send_error(403);return
  data=self.rfile.read(n)
  if len(data)!=n or not data.startswith(bytes.fromhex('1a45dfa3')):self.send_error(400);return
  TARGET.parent.mkdir(parents=True,exist_ok=True);TARGET.write_bytes(data)
  self.send_response(200);self.send_header('Access-Control-Allow-Origin','http://127.0.0.1:5178');self.end_headers();self.wfile.write(b'Saved');print('Saved',n,'bytes',flush=True)
HTTPServer(('127.0.0.1',5190),Receiver).serve_forever()

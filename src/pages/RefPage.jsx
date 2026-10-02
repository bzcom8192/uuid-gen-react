import { useState } from 'react'
import { Card, CopyBtn, Page, Seg } from '../ui'

const rows = (s) => s.trim().split('\n').map((l) => l.split('|'))
const DATA = {
  'HTTP status': { head: ['Code', 'Name', 'Meaning'], rows: rows(`
100|Continue|Client may continue sending the body
101|Switching Protocols|e.g. upgrade to WebSocket
103|Early Hints|Preload hints before the final response
200|OK|Success
201|Created|Resource created (POST / PUT)
202|Accepted|Queued, not finished yet
204|No Content|Success with empty body
206|Partial Content|Range request satisfied
301|Moved Permanently|Permanent redirect (method may change to GET)
302|Found|Temporary redirect (historic behaviour)
303|See Other|Redirect to another URL using GET
304|Not Modified|Cached copy still valid (ETag / If-Modified-Since)
307|Temporary Redirect|Redirect, keep method and body
308|Permanent Redirect|Permanent, keep method and body
400|Bad Request|Malformed request
401|Unauthorized|Not authenticated
402|Payment Required|Reserved for payment schemes
403|Forbidden|Authenticated but not allowed
404|Not Found|Resource does not exist
405|Method Not Allowed|Check the Allow header
406|Not Acceptable|Cannot satisfy the Accept header
408|Request Timeout|Client was too slow
409|Conflict|State conflict, duplicate, version mismatch
410|Gone|Permanently removed
412|Precondition Failed|If-Match / If-Unmodified-Since failed
413|Content Too Large|Payload too big
414|URI Too Long|URL exceeds server limit
415|Unsupported Media Type|Wrong Content-Type
416|Range Not Satisfiable|Bad Range header
418|I'm a teapot|RFC 2324 joke
421|Misdirected Request|Sent to a server that cannot answer
422|Unprocessable Content|Syntax ok, validation failed
423|Locked|WebDAV
425|Too Early|Replay risk with early data
426|Upgrade Required|Switch protocol first
428|Precondition Required|Conditional request needed
429|Too Many Requests|Rate limited, see Retry-After
431|Request Header Fields Too Large|Headers or cookies too big
451|Unavailable For Legal Reasons|Blocked by legal demand
500|Internal Server Error|Unhandled server error
501|Not Implemented|Method not supported
502|Bad Gateway|Upstream returned an invalid response
503|Service Unavailable|Overloaded or in maintenance, see Retry-After
504|Gateway Timeout|Upstream timed out
505|HTTP Version Not Supported|
507|Insufficient Storage|WebDAV
508|Loop Detected|WebDAV
511|Network Authentication Required|Captive portal`) },
  Ports: { head: ['Port', 'Service', 'Notes'], rows: rows(`
20-21|FTP|Data / control
22|SSH, SFTP, SCP|
23|Telnet|Insecure
25|SMTP|Server to server mail
53|DNS|UDP and TCP
67-68|DHCP|
69|TFTP|
80|HTTP|
110|POP3|
123|NTP|UDP
143|IMAP|
161-162|SNMP|UDP
179|BGP|
389|LDAP|
443|HTTPS|
445|SMB|
465|SMTPS|
514|Syslog|UDP
587|SMTP submission|STARTTLS
636|LDAPS|
873|rsync|
993|IMAPS|
995|POP3S|
1080|SOCKS proxy|
1433|Microsoft SQL Server|
1521|Oracle DB|
1883|MQTT|
2049|NFS|
2181|ZooKeeper|
2375-2376|Docker daemon|2376 is TLS
2379-2380|etcd|client / peer
3000|Node / React dev servers|
3306|MySQL / MariaDB|
3389|RDP|
4222|NATS|
4173|Vite preview|
5000|Flask dev|
5173|Vite dev|
5432|PostgreSQL|
5672|AMQP (RabbitMQ)|
5900|VNC|
6379|Redis|
6443|Kubernetes API server|
8000|Django / python -m http.server|
8080|HTTP alternate|
8443|HTTPS alternate|
8883|MQTT over TLS|
9000|MinIO / PHP-FPM|
9090|Prometheus|
9092|Kafka|
9200|Elasticsearch HTTP|
9300|Elasticsearch transport|
11211|Memcached|
15672|RabbitMQ management|
27017|MongoDB|
51820|WireGuard|UDP`) },
  MIME: { head: ['Type', 'Extension', 'Notes'], rows: rows(`
text/plain|.txt|
text/html|.html .htm|
text/css|.css|
text/csv|.csv|
text/javascript|.js .mjs|
text/markdown|.md|
text/event-stream||Server-Sent Events
application/json|.json|
application/ld+json|.jsonld|
application/x-ndjson|.ndjson|Newline-delimited JSON
application/xml|.xml|
application/yaml|.yaml .yml|
application/pdf|.pdf|
application/zip|.zip|
application/gzip|.gz|
application/x-tar|.tar|
application/x-7z-compressed|.7z|
application/octet-stream||Unknown binary
application/x-www-form-urlencoded||HTML form default
multipart/form-data||File uploads
application/wasm|.wasm|
application/sql|.sql|
application/x-pem-file|.pem|
application/x-x509-ca-cert|.crt .cer|
application/pkcs12|.p12 .pfx|
application/msword|.doc|
application/vnd.openxmlformats-officedocument.wordprocessingml.document|.docx|
application/vnd.ms-excel|.xls|
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet|.xlsx|
application/vnd.openxmlformats-officedocument.presentationml.presentation|.pptx|
image/png|.png|
image/jpeg|.jpg .jpeg|
image/gif|.gif|
image/webp|.webp|
image/avif|.avif|
image/svg+xml|.svg|
image/vnd.microsoft.icon|.ico|
audio/mpeg|.mp3|
audio/ogg|.ogg .oga|
audio/wav|.wav|
video/mp4|.mp4|
video/webm|.webm|
font/woff2|.woff2|
font/woff|.woff|
font/ttf|.ttf|
font/otf|.otf|`) },
}

export default function RefPage() {
  const [tab, setTab] = useState('HTTP status')
  const [q, setQ] = useState('')
  const d = DATA[tab]
  const s = q.trim().toLowerCase()
  const list = d.rows.filter((r) => !s || r.join(' ').toLowerCase().includes(s))
  return (
    <Page title="Reference" desc="HTTP status codes, common ports and MIME types.">
      <Card>
        <Seg options={Object.keys(DATA)} value={tab} onChange={setTab} />
        <input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Card>
      <Card title={`${tab} · ${list.length}`}>
        <div className="wrap"><table>
          <thead><tr>{d.head.map((h) => <th key={h}>{h}</th>)}<th /></tr></thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={i}><td className="mono" style={{ whiteSpace: 'nowrap' }}>{r[0]}</td><td>{r[1]}</td><td className="muted">{r[2]}</td><td><CopyBtn text={r[0]} /></td></tr>
            ))}
          </tbody>
        </table></div>
      </Card>
    </Page>
  )
}

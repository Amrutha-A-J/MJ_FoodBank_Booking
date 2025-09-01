import { fetch, Headers, Request, Response, FormData, File } from 'undici';

(global as any).fetch = fetch;
(global as any).Headers = Headers as any;
(global as any).Request = Request as any;
(global as any).Response = Response as any;
(global as any).FormData = FormData as any;
(global as any).File = File as any;


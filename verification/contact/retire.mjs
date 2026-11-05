// Verifier-only tombstone. No public-site imports, bindings, or verification access.
export default { fetch() { return new Response('Not found.', {status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}}); } };

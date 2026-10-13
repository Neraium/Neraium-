import { humanProbe, ContactVerificationSession } from './contact-human-verification.mjs';
export { ContactVerificationSession };
import { handleContact } from './contact.mjs';
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/contact-verification')) return humanProbe(request, env);
    if (new URL(request.url).pathname.startsWith('/api/')) return handleContact(request, env);
    return env.ASSETS.fetch(request);
  },
};

import { eveChannel } from "eve/channels/eve";
import { none } from "eve/channels/auth";

// This app is intended to run behind Vercel Deployment Protection. The
// deployment gate owns user access; the Eve channel accepts requests that reach
// the protected app.
export default eveChannel({ auth: [none()] });

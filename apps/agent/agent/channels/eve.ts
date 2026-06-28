import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";

// The headless platform worker self-invokes Eve from the same Vercel project.
// Local development remains open on loopback hosts only.
export default eveChannel({ auth: [vercelOidc(), localDev()] });

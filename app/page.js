import Gambit from "@/components/Gambit";
import { siteUrl } from "@/lib/site";
export const metadata = { ...(siteUrl() ? { alternates: { canonical: siteUrl() } } : {}) };

export default function Page() {
  return <Gambit />;
}

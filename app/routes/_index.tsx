import { redirect } from "@remix-run/cloudflare";
import type { LoaderFunction } from "@remix-run/cloudflare";

export const loader: LoaderFunction = async () => {
  return redirect("/generate-image");
};

export default function Index() {
  return null;
}

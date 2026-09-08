import { redirect } from "next/navigation";

/** /shop is the same hire floor as /browse. */
export default function ShopRedirect() {
  redirect("/browse");
}

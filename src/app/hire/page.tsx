import { redirect } from "next/navigation";

/** /hire is retired. The hire floor is /browse. */
export default function HireRedirect() {
  redirect("/browse");
}

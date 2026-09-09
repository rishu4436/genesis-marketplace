import { redirect } from "next/navigation";

/** /hire opens the Get plan CTA. Hash is client-only; the wizard is on the page. */
export default function HireRedirect() {
  redirect("/genesis/range-keeper");
}

import { redirect } from "next/navigation";

/** Account + hires live on My hires. */
export default function ProfileRedirect() {
  redirect("/dashboard");
}

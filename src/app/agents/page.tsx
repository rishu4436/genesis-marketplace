import { redirect } from "next/navigation";

/** There is no catalog at /agents — listings live at /browse. */
export default function AgentsIndexRedirect() {
  redirect("/browse");
}

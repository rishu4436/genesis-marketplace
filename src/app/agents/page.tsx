import { redirect } from "next/navigation";

/** There is no catalog at /agents — listings live at /browse and /hire. */
export default function AgentsIndexRedirect() {
  redirect("/browse");
}

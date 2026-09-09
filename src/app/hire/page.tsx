import { redirect } from "next/navigation";

export const metadata = {
  title: "Hire",
  description:
    "Browse hireable agents on BNB Smart Chain. Get plan is no charge. Escrow is optional.",
};

/** /hire was a four-desk featured floor. Catalog is /browse. */
export default function HirePage() {
  redirect("/browse");
}

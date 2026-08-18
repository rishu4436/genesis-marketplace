import { redirect } from "next/navigation";

export const metadata = {
  title: "Genesis",
};

export default function ClassicRedirect() {
  redirect("/");
}

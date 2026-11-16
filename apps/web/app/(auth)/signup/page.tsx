import { redirect } from "next/navigation";

/** Sign up and sign in are one flow now; keep /signup working for old links. */
export default function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
  redirect(searchParams.next ? `/login?next=${encodeURIComponent(searchParams.next)}` : "/login");
}

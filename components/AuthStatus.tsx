import Link from "next/link";
import { isLoggedIn } from "@/lib/auth";

export default async function AuthStatus() {
  if (!(await isLoggedIn())) {
    return (
      <Link href="/login" className="text-muted hover:text-text">
        Log in
      </Link>
    );
  }
  return (
    <form action="/api/auth/logout" method="post">
      <button type="submit" className="text-muted hover:text-text">
        Log out
      </button>
    </form>
  );
}

import { Suspense } from "react";

const input =
  "border border-border px-2 py-1 bg-bg focus:outline-none focus:border-text";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="p-6 max-w-xs">
      <h1 className="text-xl mb-4">Log in</h1>
      <form
        action="/api/auth/login"
        method="post"
        className="flex flex-col gap-3"
      >
        <input
          name="username"
          placeholder="Username"
          autoComplete="username"
          required
          className={input}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          required
          className={input}
        />
        <button
          type="submit"
          className="px-3 py-1 bg-inverse-bg text-inverse-text hover:bg-[#333]"
        >
          Log in
        </button>
      </form>
      <Suspense>
        <LoginError searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function LoginError({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  return error ? (
    <p className="mt-3 text-sm text-muted">Wrong username or password.</p>
  ) : null;
}

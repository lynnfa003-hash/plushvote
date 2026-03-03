import Link from "next/link";

export default function ToyNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black text-brand-textDark">This plush idea is not available.</h1>
      <p className="mt-3 text-sm font-semibold text-brand-textMuted">
        It may be pending moderation or has been removed.
      </p>
      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex rounded-2xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-brand-primaryHover"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}

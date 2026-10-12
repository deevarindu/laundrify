import { Link } from "react-router-dom";

function HomePage() {
  return (
    <main className="min-h-dvh bg-[#f7f2eb] text-[#292b25]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6">
        <header className="flex items-center justify-between py-6">
          <Link
            to="/"
            className="text-xl font-semibold tracking-tight"
          >
            laundrify
          </Link>

          <Link
            to="/login"
            className="text-sm font-medium text-gray-500 transition hover:text-[#8b9a6e]"
          >
            Staff Login
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-center pb-12">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#8b9a6e]">
            LAUNDRY, MADE SIMPLE
          </p>

          <h1 className="mt-5 text-[clamp(2.8rem,12vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.05em]">
            Clean clothes.
            <span className="mt-1 block text-[#8b9a6e]">
              Less hassle.
            </span>
          </h1>

          <p className="mt-6 text-[15px] leading-7 text-gray-500">
            Laundry care, made easier. Request a pickup
            from home and let Laundrify take care of the rest.
          </p>

          <div className="mt-9 space-y-3">
            <Link
              to="/request"
              className="flex min-h-14 w-full items-center justify-center rounded-xl bg-[#8b9a6e] px-5 text-sm font-semibold text-white transition hover:bg-[#78865e] active:scale-[0.98]"
            >
              Request Pickup
            </Link>

            <Link
              to="/track"
              className="flex min-h-14 w-full items-center justify-center rounded-xl border border-[#d8d4cc] px-5 text-sm font-semibold text-[#292b25] transition hover:bg-white/50 active:scale-[0.98]"
            >
              Track Order
            </Link>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            Simple booking. Easy tracking.
          </p>
        </section>

        <footer className="py-5 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Laundrify
        </footer>
      </div>
    </main>
  );
}

export default HomePage;
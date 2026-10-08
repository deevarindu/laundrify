import { Link } from "react-router-dom";

function HomePage() {
  return (
    <main className="min-h-dvh bg-[#f7f2eb] text-[#292b25]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5">
        <header className="flex shrink-0 items-center justify-between py-6">
          <Link
            to="/"
            className="text-xl font-semibold tracking-tight"
          >
            Laundrify
          </Link>

          <Link
            to="/login"
            className="text-sm font-medium text-gray-500"
          >
            Staff Login
          </Link>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#8b9a6e]">
              LAUNDRY, MADE SIMPLE
            </p>

            <h1 className="mt-5 text-[clamp(2.6rem,12vw,3.8rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
              Clean clothes.
              <span className="block text-[#8b9a6e]">
                Less hassle.
              </span>
            </h1>

            <p className="mt-6 max-w-[340px] text-[15px] leading-7 text-gray-500">
              Laundry pickup dan delivery yang simpel.
              Request dari rumah, lalu biarkan kami
              mengurus laundry kamu.
            </p>
          </div>

          <div className="mt-9 space-y-3">
            <Link
              to="/request"
              className="flex min-h-14 w-full items-center justify-center rounded-xl bg-[#8b9a6e] px-5 text-sm font-semibold text-white transition active:scale-[0.98]"
            >
              Request Pickup
            </Link>

            <Link
              to="/track"
              className="flex min-h-14 w-full items-center justify-center rounded-xl border border-[#d8d4cc] px-5 text-sm font-semibold text-gray-700 transition active:scale-[0.98]"
            >
              Track Order
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HomePage;
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-12">
      <section className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Laundry made simple
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
          laundrify.
        </h1>

        <p className="mt-3 leading-7 text-slate-600">
          Baju bersih, hidup lebih mudah. Pantau pesanan laundry kamu
          dengan praktis.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/track"
            className="rounded-xl bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-700"
          >
            Lacak pesanan
          </Link>

          <Link
            to="/services"
            className="rounded-xl border border-slate-200 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
          >
            Lihat layanan
          </Link>
        </div>
      </section>
    </main>
  );
}
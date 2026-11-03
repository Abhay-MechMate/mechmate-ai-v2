"use client";

import { addVehicleAction } from "@/app/garage/actions";
import Link from "next/link";
import { useState } from "react";

const commonMakes = [
  "Acura",
  "Audi",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jeep",
  "Kia",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Mazda",
  "Mercedes-Benz",
  "MINI",
  "Mitsubishi",
  "Nissan",
  "Porsche",
  "Ram",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
];

type AddMode = "vin" | "manual";

type AddVehicleFormProps = {
  error?: string;
};

const inputClassName =
  "mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

const tabClassName = (active: boolean) =>
  `flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
    active
      ? "bg-emerald-500 text-emerald-950"
      : "border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500"
  }`;

export function AddVehicleForm({ error }: AddVehicleFormProps) {
  const [mode, setMode] = useState<AddMode>("vin");

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/garage"
          className="text-sm font-medium text-zinc-400 transition-colors hover:text-emerald-400"
        >
          ← Back to Garage
        </Link>

        <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Add a vehicle
          </h1>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setMode("vin")}
              className={tabClassName(mode === "vin")}
            >
              Decode by VIN
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={tabClassName(mode === "manual")}
            >
              Enter manually
            </button>
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-red-900/70 bg-red-950/50 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          ) : null}

          {mode === "vin" ? (
            <form action={addVehicleAction} className="mt-7 space-y-6">
              <p className="text-sm leading-relaxed text-zinc-400">
                Paste the 17-character VIN (on your registration or the
                driver&apos;s-side door jamb) and we&apos;ll fill in the year,
                make, model, trim, and engine automatically.
              </p>

              <label className="block text-sm font-medium text-zinc-200">
                VIN
                <input
                  type="text"
                  name="vin"
                  required
                  minLength={10}
                  maxLength={17}
                  autoComplete="off"
                  className={`${inputClassName} uppercase`}
                  placeholder="1HGCM82633A004352"
                />
              </label>

              <label className="block text-sm font-medium text-zinc-200">
                Nickname{" "}
                <span className="font-normal text-zinc-500">(optional)</span>
                <input
                  type="text"
                  name="nickname"
                  className={inputClassName}
                  placeholder="Daily driver"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-medium text-emerald-950 transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              >
                Save vehicle
              </button>
            </form>
          ) : (
            <form action={addVehicleAction} className="mt-7 space-y-6">
              <p className="text-sm leading-relaxed text-zinc-400">
                No VIN handy? Add the details yourself — only year, make, and
                model are required.
              </p>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-zinc-200">
                  Year
                  <input
                    type="number"
                    name="year"
                    inputMode="numeric"
                    min="1886"
                    max="2100"
                    className={inputClassName}
                    placeholder="2020"
                  />
                </label>

                <label className="block text-sm font-medium text-zinc-200">
                  Make
                  <input
                    type="text"
                    name="make"
                    required
                    list="make-list"
                    className={inputClassName}
                    placeholder="Toyota"
                  />
                  <datalist id="make-list">
                    {commonMakes.map((make) => (
                      <option key={make} value={make} />
                    ))}
                  </datalist>
                </label>

                <label className="block text-sm font-medium text-zinc-200 sm:col-span-2">
                  Model
                  <input
                    type="text"
                    name="model"
                    required
                    className={inputClassName}
                    placeholder="Camry"
                  />
                </label>

                <label className="block text-sm font-medium text-zinc-200">
                  Trim{" "}
                  <span className="font-normal text-zinc-500">(optional)</span>
                  <input
                    type="text"
                    name="trim"
                    className={inputClassName}
                    placeholder="SE"
                  />
                </label>

                <label className="block text-sm font-medium text-zinc-200">
                  Engine{" "}
                  <span className="font-normal text-zinc-500">(optional)</span>
                  <input
                    type="text"
                    name="engine"
                    className={inputClassName}
                    placeholder="2.5L I4"
                  />
                </label>

                <label className="block text-sm font-medium text-zinc-200 sm:col-span-2">
                  Mileage{" "}
                  <span className="font-normal text-zinc-500">(optional)</span>
                  <input
                    type="number"
                    name="mileage"
                    inputMode="numeric"
                    min="0"
                    className={inputClassName}
                    placeholder="45000"
                  />
                </label>

                <label className="block text-sm font-medium text-zinc-200 sm:col-span-2">
                  Nickname{" "}
                  <span className="font-normal text-zinc-500">(optional)</span>
                  <input
                    type="text"
                    name="nickname"
                    className={inputClassName}
                    placeholder="Daily driver"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 font-medium text-emerald-950 transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              >
                Save vehicle
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

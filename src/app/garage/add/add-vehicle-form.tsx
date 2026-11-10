"use client";

import { addVehicleAction } from "@/app/garage/actions";
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
  "mt-2 w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-fg transition placeholder:text-fg-muted focus-visible:border-accent";

const tabClassName = (active: boolean) =>
  `flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
    active
      ? "bg-accent text-on-accent"
      : "border border-line-strong text-fg-secondary hover:border-fg-muted hover:text-fg"
  }`;

export function AddVehicleForm({ error }: AddVehicleFormProps) {
  const [mode, setMode] = useState<AddMode>("vin");

  return (
    <div>
        <section className="rounded-xl border border-line bg-surface p-6 sm:p-8">
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
              className="mt-5 rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-fg"
            >
              {error}
            </p>
          ) : null}

          {mode === "vin" ? (
            <form action={addVehicleAction} className="mt-7 space-y-6">
              <p className="text-sm leading-relaxed text-fg-secondary">
                Paste the 17-character VIN (on your registration or the
                driver&apos;s-side door jamb) and we&apos;ll fill in the year,
                make, model, trim, and engine automatically.
              </p>

              <label className="block text-sm font-medium text-fg-secondary">
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

              <label className="block text-sm font-medium text-fg-secondary">
                Nickname{" "}
                <span className="font-normal text-fg-muted">(optional)</span>
                <input
                  type="text"
                  name="nickname"
                  className={inputClassName}
                  placeholder="Daily driver"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                Save vehicle
              </button>
            </form>
          ) : (
            <form action={addVehicleAction} className="mt-7 space-y-6">
              <p className="text-sm leading-relaxed text-fg-secondary">
                No VIN handy? Add the details yourself — only year, make, and
                model are required.
              </p>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-fg-secondary">
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

                <label className="block text-sm font-medium text-fg-secondary">
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

                <label className="block text-sm font-medium text-fg-secondary sm:col-span-2">
                  Model
                  <input
                    type="text"
                    name="model"
                    required
                    className={inputClassName}
                    placeholder="Camry"
                  />
                </label>

                <label className="block text-sm font-medium text-fg-secondary">
                  Trim{" "}
                  <span className="font-normal text-fg-muted">(optional)</span>
                  <input
                    type="text"
                    name="trim"
                    className={inputClassName}
                    placeholder="SE"
                  />
                </label>

                <label className="block text-sm font-medium text-fg-secondary">
                  Engine{" "}
                  <span className="font-normal text-fg-muted">(optional)</span>
                  <input
                    type="text"
                    name="engine"
                    className={inputClassName}
                    placeholder="2.5L I4"
                  />
                </label>

                <label className="block text-sm font-medium text-fg-secondary sm:col-span-2">
                  Mileage{" "}
                  <span className="font-normal text-fg-muted">(optional)</span>
                  <input
                    type="number"
                    name="mileage"
                    inputMode="numeric"
                    min="0"
                    className={inputClassName}
                    placeholder="45000"
                  />
                </label>

                <label className="block text-sm font-medium text-fg-secondary sm:col-span-2">
                  Nickname{" "}
                  <span className="font-normal text-fg-muted">(optional)</span>
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
                className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-on-accent transition-colors hover:bg-accent-hover"
              >
                Save vehicle
              </button>
            </form>
          )}
        </section>
    </div>
  );
}

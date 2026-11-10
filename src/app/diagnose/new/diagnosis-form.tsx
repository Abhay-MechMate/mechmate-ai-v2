"use client";

import {
  startDiagnosisAction,
  type DiagnosisFormState,
} from "@/app/diagnose/actions";
import { useActionState } from "react";

export type DiagnosisVehicleOption = {
  id: string;
  nickname: string | null;
  modelYear: number | null;
  make: string;
  model: string;
};

const inputClassName =
  "mt-2 w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-fg transition placeholder:text-fg-muted focus-visible:border-accent disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-fg-muted";

function optionLabel(vehicle: DiagnosisVehicleOption): string {
  return (
    vehicle.nickname ||
    [vehicle.modelYear, vehicle.make, vehicle.model].filter(Boolean).join(" ")
  );
}

export function DiagnosisForm({
  vehicles,
  defaultVehicleId,
}: {
  vehicles: DiagnosisVehicleOption[];
  defaultVehicleId: string;
}) {
  const initialState: DiagnosisFormState = {
    error: null,
    values: { vehicleId: defaultVehicleId, codes: "", symptoms: "" },
  };
  const [state, formAction, pending] = useActionState(
    startDiagnosisAction,
    initialState,
  );
  const fieldKey = [
    state.values.vehicleId,
    state.values.codes,
    state.values.symptoms,
    state.error,
  ].join(":");

  return (
    <form action={formAction} className="mt-7 space-y-6">
      <label className="block text-sm font-medium text-fg-secondary">
        Vehicle
        <select
          key={`${fieldKey}:vehicle`}
          name="vehicleId"
          required
          disabled={pending}
          defaultValue={state.values.vehicleId}
          className={inputClassName}
        >
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {optionLabel(vehicle)}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-fg-secondary">
        Trouble codes <span className="font-normal text-fg-muted">(optional)</span>
        <input
          key={`${fieldKey}:codes`}
          type="text"
          name="codes"
          autoComplete="off"
          disabled={pending}
          defaultValue={state.values.codes}
          className={`${inputClassName} uppercase`}
          placeholder="P0420, P0171"
        />
        <span className="mt-2 block text-xs font-normal text-fg-muted">
          Separate multiple codes with commas. Up to 5. Codes look like P0420.
        </span>
      </label>

      <label className="block text-sm font-medium text-fg-secondary">
        What&apos;s happening?{" "}
        <span className="font-normal text-fg-muted">(optional)</span>
        <textarea
          key={`${fieldKey}:symptoms`}
          name="symptoms"
          rows={4}
          maxLength={1000}
          disabled={pending}
          defaultValue={state.values.symptoms}
          className={`${inputClassName} resize-y`}
          placeholder="e.g. Shudders when I brake going downhill, started last week"
        />
        <span className="mt-2 block text-xs font-normal text-fg-muted">
          Use your own words—no technical terms needed. Enter 3–1,000 characters.
        </span>
      </label>

      <p className="text-sm leading-relaxed text-fg-secondary">
        Fill in at least one: codes or a description. Both gives the best result.
      </p>

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-sm text-danger-fg"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:border-line disabled:bg-surface disabled:text-fg-muted"
      >
        {pending
          ? "Analyzing… this can take up to 30 seconds"
          : "Run diagnosis"}
      </button>
    </form>
  );
}

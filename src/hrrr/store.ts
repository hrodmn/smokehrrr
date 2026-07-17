import { HttpStorage, IcechunkStore, ReadSession, Repository } from "icechunk-js";
import * as zarr from "zarrita";
import { HRRR_BRANCH, HRRR_REPO_URL, HRRR_VIRTUAL_CHUNK_CONTAINERS, SMOKE_VARIABLE } from "./metadata";

export type SmokeSource = {
  array: zarr.Array<"float32" | "float64", zarr.Readable>;
  variable: string;
  noDataValue: number;
};

export function validateSmokeArray(
  array: Pick<zarr.Array<zarr.DataType, zarr.Readable>, "dtype" | "shape" | "attrs">,
  variable: string,
): number {
  if (array.dtype !== "float32" && array.dtype !== "float64") {
    throw new Error(`Expected ${variable} to be float32 or float64, got ${array.dtype}`);
  }
  if (array.shape.length !== 4) {
    throw new Error(`Expected ${variable} dimensions [init_time, lead_time, y, x], got [${array.shape.join(", ")}]`);
  }

  const fill = array.attrs._FillValue ?? array.attrs.missing_value;
  if (typeof fill === "number") {
    return fill;
  }
  return Number.NaN;
}

export async function openSmokeSource(): Promise<SmokeSource> {
  const storage = new HttpStorage(HRRR_REPO_URL);
  const repo = await Repository.open({ storage, formatVersion: "v2" });
  const branchSession = await repo.checkoutBranch(HRRR_BRANCH);
  const session = await ReadSession.open(storage, branchSession.getSnapshotId(), {
    virtualChunkContainers: HRRR_VIRTUAL_CHUNK_CONTAINERS,
  });
  const store = await IcechunkStore.open(session);

  const array = await zarr.open(store.resolve(`/${SMOKE_VARIABLE}`), { kind: "array" });
  const noDataValue = validateSmokeArray(array, SMOKE_VARIABLE);

  try {
    await zarr.get(array, [array.shape[0]! - 1, 0, zarr.slice(0, 1), zarr.slice(0, 1)]);
  } catch (error) {
    throw new Error(
      `Opened ${SMOKE_VARIABLE}, but browser chunk decoding is blocked: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return { array: array as zarr.Array<"float32" | "float64", zarr.Readable>, variable: SMOKE_VARIABLE, noDataValue };
}

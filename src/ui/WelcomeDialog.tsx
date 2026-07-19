export const WELCOME_DISMISSED_KEY = "smokehrrr.welcomeDismissed";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function shouldShowWelcome(storage = browserStorage()): boolean {
  try {
    return storage?.getItem(WELCOME_DISMISSED_KEY) !== "true";
  } catch {
    return true;
  }
}

function dismissWelcome(storage = browserStorage()) {
  try {
    storage?.setItem(WELCOME_DISMISSED_KEY, "true");
  } catch {
    // Ignore blocked storage. The dialog can reappear next visit.
  }
}

export function WelcomeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="welcome-backdrop" role="presentation">
      <section
        className="panel welcome-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        <h3 id="welcome-title">
          This is a map view of near-surface smoke mass density from NOAA's High
          Resolution Rapid Refresh (HRRR) models.
        </h3>
        <p>
          Use the timeline to view recent forecasts of smoke mass density across
          CONUS. Click the map to chart modeled smoke at a location.
        </p>
        <p>
          Forecast frames are model guidance, not official air-quality
          observations. New HRRR forecast files can also lag before they land in
          NOAA's S3 archive; a missing frame usually becomes available after a
          short wait.
        </p>
        <div className="welcome-actions">
          <a
            href="https://registry.opendata.aws/noaa-hrrr-pds/"
            target="_blank"
            rel="noreferrer"
          >
            NOAA HRRR data source
          </a>
          <button
            type="button"
            onClick={() => {
              dismissWelcome();
              onClose();
            }}
          >
            Go!
          </button>
        </div>
      </section>
    </div>
  );
}

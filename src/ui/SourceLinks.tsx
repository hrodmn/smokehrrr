const links = [
  ["NOAA HRRR", "https://rapidrefresh.noaa.gov/hrrr/"],
  ["Source data", "https://registry.opendata.aws/noaa-hrrr-pds/"],
  ["GitHub", "https://github.com/hrodmn/smokehrrr"],
] as const;

export function SourceLinks() {
  return (
    <nav className="source-links" aria-label="Source data links">
      {links.map(([label, href]) => (
        <a key={href} href={href} target="_blank" rel="noreferrer">
          {label}
        </a>
      ))}
    </nav>
  );
}

import AdbDisplay from "./components/AdbDisplay";

export default function Home() {
  return (
    <div className="app-fullscreen">
      <AdbDisplay
        width={1000}
        height={1000}
        refreshInterval={100}
      />
    </div>
  );
}

import VirtualDesktop from "./components/VirtualDesktop";

export default function Home() {
  return (
    <div className="app-fullscreen">
      <VirtualDesktop 
        host="localhost"
        port={8006}
        hideControls={true}
      />
    </div>
  );
}

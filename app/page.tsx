import VirtualTablet from "./components/VirtualDesktop";

export default function Home() {
  return (
    <div className="app-fullscreen">
      <VirtualTablet 
        host="localhost"
        port={6080}
        hideControls={true}
        viewOnly={true}
      />
    </div>
  );
}

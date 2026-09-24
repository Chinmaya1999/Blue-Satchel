import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

const NotFound = () => (
  <div className="fs-page fs-page-bg">
    <div className="container-app flex flex-col items-center justify-center gap-4 py-28 text-center">
      <p className="fs-footer-wordmark !text-[clamp(6rem,22vw,12rem)]" aria-hidden="true">404</p>
      <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/25">
        <Compass size={26} />
      </span>
      <h1 className="fs-page-title">Page not found</h1>
      <p className="text-slate-400">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary mt-2 rounded-full">Back home</Link>
    </div>
  </div>
);

export default NotFound;

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLoading } from "../context/LoadingProvider";

export default function RouteLoadingWatcher() {
  const location = useLocation();
  const { startLoading, stopLoading } = useLoading();
  
  useEffect(() => {
    startLoading();
    const timeout = setTimeout(() => stopLoading(), 300);
    return () => clearTimeout(timeout);
  }, [location]);
  
  return null;
}
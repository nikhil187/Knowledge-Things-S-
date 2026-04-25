const getSocketUrl = () => {
  if (typeof window === "undefined") return "";
  const env = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (env) return env;
  const { hostname } = window.location;
  // Local dev: backend runs on 3001
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${window.location.protocol}//${hostname}:3001`;
  }
  // Production: same host as frontend
  return `${window.location.protocol}//${hostname}`;
};

export { getSocketUrl };

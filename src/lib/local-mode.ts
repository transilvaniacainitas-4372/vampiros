export const isLocalMode =
  import.meta.env.VITE_LOCAL_MODE === "true" || import.meta.env.VITE_USE_LOCAL_DATA === "true";

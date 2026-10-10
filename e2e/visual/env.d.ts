// The debug hook's own type lives in the client; the visual checks only need to know it exists.
declare global {
  interface Window {
    __board?: unknown;
  }
}
export {};

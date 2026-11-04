import type { StickieAPI } from '../shared/ipc-contract'

declare global {
  interface Window {
    stickie: StickieAPI
  }
}

export { }


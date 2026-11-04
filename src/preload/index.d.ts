import type { StiklyAPI } from '../shared/ipc-contract'

declare global {
  interface Window {
    stikly: StiklyAPI
  }
}

export {}


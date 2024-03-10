import { createContext } from 'react'

export interface UserContextType {
  user: {
    username: string
  }
  token: string
}

export const UserContext = createContext<UserContextType | undefined>(undefined)

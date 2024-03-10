import { useState, type FC, useContext, useEffect } from 'react';
import { UserContext } from '../UserContext';
import { Button } from '@chakra-ui/react';

export interface QueueProps {
  isInQueue: boolean;
  enterQueue: (error?: string) => void;
  leaveQueue: () => void;
}

export const Queue: FC<QueueProps> = ({ isInQueue, enterQueue, leaveQueue }) => {
  const [queueTime, setQueueTime] = useState<number | undefined>(undefined)
  const [queueIsLoading, setQueueIsLoading] = useState(false)
  const identity = useContext(UserContext)

  const enterMatchmaking = async () => {
    if (!identity) {
      return
    }

    setQueueIsLoading(true)
    try {
      await fetch(new URL('/matchmaking/join', import.meta.env.VITE_API_URL), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${identity.token}`
        }
      })
      enterQueue()
    } finally {
      setQueueIsLoading(false)
    }
  }

  const leaveMatchmaking = async () => {
    if (!identity) {
      return
    }

    setQueueIsLoading(true)
    try {
      await fetch(new URL('/matchmaking/leave', import.meta.env.VITE_API_URL), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${identity.token}`
        }
      })
      leaveQueue()
    } finally {
      setQueueIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isInQueue) {
      setQueueTime(undefined)
      return
    }

    setQueueTime(1)
    const interval = setInterval(() => {
      setQueueTime((prev) => prev ? prev + 1 : 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isInQueue])

  if (!identity) {
    return null
  }

  return (
    <>
      <h1>Welcome, {identity.user.username}</h1>
      {!isInQueue && <Button isLoading={queueIsLoading} maxWidth={200} onClick={enterMatchmaking}>Quick match</Button>}
      {isInQueue && <Button isLoading={queueIsLoading} maxWidth={200} onClick={leaveMatchmaking}>Leave queue ({queueTime}s)</Button>}
    </>
  )
}

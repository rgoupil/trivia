import { useEffect, useState } from 'react'
import './App.css'
import { socket } from './socket';
import { UserContext, type UserContextType } from './UserContext';
import { Login } from './components/Login';
import { Button, Flex, Stack, useToast } from '@chakra-ui/react';
import { Queue } from './components/Queue';
import { Match } from './components/Match';

const getIdentityFromLocalStorage = () => {
  const username = localStorage.getItem('username')
  const token = localStorage.getItem('token')

  if (!username || !token) {
    return undefined
  }

  return { user: { username: username }, token }
}

const setIdentityToLocalStorage = (identity: UserContextType | undefined) => {
  if (!identity) {
    localStorage.removeItem('username')
    localStorage.removeItem('token')
    return
  }
  localStorage.setItem('username', identity.user.username)
  localStorage.setItem('token', identity.token)
}

function App() {
  const [identity, setIdentity] = useState<UserContextType | undefined>(getIdentityFromLocalStorage())
  const [isInQueue, setIsInQueue] = useState(false)
  const [matchId, setMatchId] = useState<string | undefined>(undefined)
  const toast = useToast()

  const logout = () => {
    setIdentity(undefined)
  }

  useEffect(() => {
    setIdentityToLocalStorage(identity)

    if (!identity) {
      return;
    }

    socket.on('match-created', (matchId: string) => {
      setMatchId(matchId)
    });

    socket.auth = { token: identity.token }
    socket.connect()

    return () => {
      socket.off('match-created')
      socket.disconnect()
    }
  }, [identity])

  if (!identity) {
    return (
      <Login onLogin={(user, token) => { setIdentity({ user, token }) }} />
    )
  }

  return (
    <UserContext.Provider value={identity}>
      <Flex position={'fixed'} top={0} left={0} right={0} justifyContent={'flex-end'} padding={5}>
        <Button onClick={logout}>Logout</Button>
      </Flex>
      <Stack gap={20} alignItems={'center'}>
        {!matchId && <Queue isInQueue={isInQueue} enterQueue={(error) => {
          if (error) {
            toast({
              title: 'Error',
              description: error,
              status: 'error',
              duration: 3000,
              isClosable: true,
            })
            return;
          }
          setIsInQueue(true)
        }} leaveQueue={() => setIsInQueue(false)} />}
        {matchId && <Match matchId={matchId} />}
      </Stack>
    </UserContext.Provider>
  )
}

export default App

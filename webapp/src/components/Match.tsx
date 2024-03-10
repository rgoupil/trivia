import { useQuery } from '@tanstack/react-query';
import { useContext, type FC, useEffect, useState } from 'react';
import { UserContext } from '../UserContext';
import { Question } from './Question';
import { socket } from '../socket';
import { Button, Stack, Text, useToast } from '@chakra-ui/react';

export interface MatchProps {
  matchId: string
}

export const Match: FC<MatchProps> = ({
  matchId,
}) => {
  const identity = useContext(UserContext)
  const [currentQuestionId, setCurrentQuestionId] = useState<string | undefined>(undefined)
  const [questionNumber, setQuestionNumber] = useState<number>(0)
  const [score, setScore] = useState<Array<number> | undefined>(undefined)
  const [matchIsEnded, setMatchIsEnded] = useState<boolean>(false)
  const [matchWinner, setMatchWinner] = useState<string | undefined>(undefined)
  const toast = useToast()
  const { data: match } = useQuery({
    enabled: !!matchId,
    queryKey: ['match', matchId],
    queryFn: async () => {
      if (!identity) {
        return
      }
      const res = await fetch(new URL(`/match/${matchId}`, import.meta.env.VITE_API_URL), {
        headers: {
          'Authorization': `Bearer ${identity.token}`
        }
      })
      return res.json() as Promise<{
        users: {
          username: string,
        }[],
        winnerId: string,
        score: Record<string, number>,
      }>
    },
  })
  const otherUser = match?.users.find(u => u.username !== identity?.user.username)

  useEffect(() => {
    if (!identity || !otherUser || !match || score) {
      return;
    }

    setScore([
      match.score[identity.user.username],
      match.score[otherUser.username],
    ])
  }, [identity, otherUser, match])

  useEffect(() => {
    socket.on('next-question', (questionId: string, questionNumber: number) => {
      setCurrentQuestionId(questionId)
      setQuestionNumber(questionNumber)
    })

    socket.on('correct-answer', (userId: string) => {
      if (userId === identity?.user.username) {
        return;
      }

      toast({
        title: `${userId} answered correctly!`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    })

    socket.on('match-ended', (data: { winner: string }) => {
      setMatchWinner(data.winner)
      setMatchIsEnded(true)
    })

    return () => {
      socket.off('next-question')
      socket.off('correct-answer')
      socket.off('match-ended')
    }
  }, [otherUser, matchId])

  useEffect(() => {
    socket.on('score-update', (newScore: Record<string, number>) => {
      console.log('score-update', newScore, identity, otherUser)
      if (!identity || !otherUser) {
        return;
      }

      setScore([
        newScore[identity.user.username] ?? 0,
        newScore[otherUser.username] ?? 0,
      ])
    })

    return () => {
      socket.off('score-update')
    }
  }, [identity, otherUser])

  return (
    <>
      <Stack spacing={4}>
        <Stack>
          <Text fontSize={40}>{identity?.user.username} vs {otherUser?.username}</Text>
          <Text fontSize={14}>Best of 5</Text>
        </Stack>
        <Text fontSize={40}>{score?.[0] ?? 0} - {score?.[1] ?? 0}</Text>
      </Stack>
      {!matchIsEnded ? (
        <Question matchId={matchId} currentQuestionId={currentQuestionId} questionNumber={questionNumber} />
      ) : (
        <Stack spacing={4}>
          <Text fontSize={40}>
            {matchWinner ? <>{matchWinner} wins!</> : <>It's a draw!</>}
          </Text>
          <Button onClick={() => window.location.reload()}>Play again</Button>
        </Stack>
      )}
    </>
  )
}

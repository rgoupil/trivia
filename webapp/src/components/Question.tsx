import { type FC, useContext, useState, useEffect } from 'react';
import { UserContext } from '../UserContext';
import { useQuery } from '@tanstack/react-query';
import { Button, FormControl, Input, Stack, Text } from '@chakra-ui/react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { socket } from '../socket';

interface AnswerFormData {
  answer: string
}

export interface QuestionProps {
  matchId: string
  currentQuestionId: string | undefined
  questionNumber: number
}

export const Question: FC<QuestionProps> = ({
  matchId,
  currentQuestionId,
  questionNumber,
}) => {
  const identity = useContext(UserContext)
  const [answerIsCorrect, setAnswerIsCorrect] = useState<boolean | null>(null)
  const { register, handleSubmit, formState: { isSubmitting, errors }, getValues, reset } = useForm<AnswerFormData>()
  const { data: question } = useQuery({
    enabled: !!currentQuestionId,
    queryKey: ['question', currentQuestionId],
    queryFn: async () => {
      if (!identity) {
        return
      }
      const res = await fetch(new URL(`/question/${currentQuestionId}`, import.meta.env.VITE_API_URL), {
        headers: {
          'Authorization': `Bearer ${identity.token}`
        }
      })
      return res.json() as Promise<{
        question: string,
      }>
    },
  })

  const sendAnswer: SubmitHandler<AnswerFormData> = async ({ answer }) => {
    const isCorrect = await socket.emitWithAck('answer-question', matchId, answer)
    setAnswerIsCorrect(isCorrect)
  }

  useEffect(() => {
    reset()
    setAnswerIsCorrect(null)
  }, [currentQuestionId])

  return (
    <Stack spacing={10}>
      {!question ? <p>Loading question...</p> : (
        <>
          <Stack spacing={4}>
            <Text fontSize={20}>Question {questionNumber}</Text>
            <p>{question.question}</p>
          </Stack>
          {answerIsCorrect == null ? (
            <form onSubmit={handleSubmit(sendAnswer)}>
              <Stack spacing={4}>
                <FormControl>
                  <Input isInvalid={!!errors.answer} {...register('answer')} />
                </FormControl>
                <Button type="submit" isLoading={isSubmitting} disabled={!!errors.answer}>Answer</Button>
              </Stack>
            </form>
          ) : (
            <Stack spacing={4}>
              <Text>{getValues('answer')}</Text>
              <h3>Result:</h3>
              {answerIsCorrect ? (
                <Text>Your answer is correct!</Text>
              ) : (
                <Text>Your answer is incorrect.</Text>
              )}
            </Stack>
          )}
        </>
      )}
    </Stack>
  )
}
